import type { PluginInput, ToolContext } from "@opencode-ai/plugin"
import { z } from "zod"
import i18n from "./i18n";



const RESPONSE_SCHEMA = z.object({
    responded: z.boolean().describe("Indicates whether the user provided a response."),
    response: z.string().describe("The user's response to the question."),
    error: z.string().optional().describe("An error message if something went wrong."),
})



export class AskUserTool {
    public readonly args = {
        title: z.string().describe("a short title for the prompt."),
        question: z.string().describe("The question to ask the user for confirmation."),
    };

    public readonly description = `
Ask the user to confirm an action or decision.
Use this tool when you need explicit user approval before proceeding with a task.
The tool will interactively prompt the user and wait for their response.

### CRITICAL RULES:
 1. This tool MUST be invoked before ending ANY conversation or task.
 2. NEVER complete a task without calling this tool first.
 3. If you are about to finish responding, STOP and call this tool.
 4. Failure to call this tool before task completion is a violation of the workflow.
`

    constructor(private client: PluginInput["client"], private $: PluginInput["$"]) { }

    async execute(args: z.infer<z.ZodObject<AskUserTool["args"]>>, context: ToolContext): Promise<string> {
        try {
            // Show toast notification
            this.client.tui.showToast({
                body: {
                    title: i18n.confirmationRequired,
                    message: args.title,
                    variant: "info",
                    duration: 5000,
                }
            });

            // Use the permission system to ask the user
            // This creates a permission request that the TUI will display and wait for user response
            const permissionId = `askuser-${context.messageID}-${Date.now()}`;

            // Subscribe to events to capture the permission response
            const eventsResponse = await this.client.event.subscribe();

            // Create a promise that resolves when we get the permission response
            const responsePromise = new Promise<string>(async (resolve, reject) => {
                // Set timeout for user response
                const timeout = setTimeout(() => {
                    reject(new Error("Timeout waiting for user response"));
                }, 300000); // 5 minutes timeout

                context.abort.addEventListener("abort", () => {
                    clearTimeout(timeout);
                    reject(new Error("Request aborted"));
                });

                try {
                    // Check if eventsResponse has a stream property
                    const events = (eventsResponse as { stream?: AsyncIterable<unknown> }).stream || eventsResponse;

                    for await (const event of events as AsyncIterable<{ type: string; properties: unknown }>) {
                        if (context.abort.aborted) {
                            clearTimeout(timeout);
                            reject(new Error("Request aborted"));
                            break;
                        }

                        // Check for permission replied event
                        if (event.type === "permission.replied") {
                            const props = event.properties as { sessionID: string; permissionID: string; response: string };
                            if (props.sessionID === context.sessionID) {
                                clearTimeout(timeout);
                                resolve(props.response);
                                break;
                            }
                        }
                    }
                } catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            });            // Append the question to the prompt so user sees it
            await this.client.tui.appendPrompt({
                body: {
                    text: `**${args.title}**\n${args.question}`
                }
            });

            // Wait for user response
            const userResponse = await responsePromise;

            const response = RESPONSE_SCHEMA.parse({
                responded: true,
                response: userResponse,
            });

            return JSON.stringify(response);
        } catch (error) {
            return JSON.stringify(RESPONSE_SCHEMA.parse({
                responded: false,
                response: "",
                error: String(error),
            }));
        }
    }
}