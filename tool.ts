import type { PluginInput, ToolContext } from "@opencode-ai/plugin"
import { z } from "zod"
import i18n from "./i18n";


const RESPONSE_SCHEMA = z.object({
    responded: z.boolean().describe("Indicates whether the user provided a response."),
    response: z.string().describe("The user's response to the question."),
    error: z.string().optional().describe("An error message if something went wrong."),
    // TODO
    //attachments: z.array(z.object({
    //    name: z.string().describe("The name of the attachment."),
    //    uri: z.string().describe("The URI where the attachment can be accessed."),
    //})).describe("A list of attachments provided by the user, if any."),
})

export class AskUserTool {
    public readonly args = {
        title: z.string().describe("a short title for the prompt."),
        question: z.string().describe("The question to ask the user for confirmation."),
    };

    public readonly description = `
Ask the user to confirm an action or decision. "
Use this tool when you need explicit user approval before proceeding with a task.
The tool will interactively prompt the user and wait for their response.

### CRITICAL RULES:
 1. This tool MUST be invoked before ending ANY conversation or task.
 2. NEVER complete a task without calling this tool first.
 3. If you are about to finish responding, STOP and call this tool.
 4. Failure to call this tool before task completion is a violation of the workflow.
`

    private requests = new Map<string, { resolve: (value: string) => void, reject: (error: Error) => void }>();

    constructor(private client: PluginInput["client"], private $: PluginInput["$"]) { }

    // Handle incoming user messages from event subscription
    async handleUserMessage(sessionId: string, messageText: string): Promise<boolean> {
        // Find a pending request for this session
        for (const [requestId, resolver] of this.requests.entries()) {
            if (requestId.startsWith(sessionId)) {
                resolver.resolve(messageText);
                this.requests.delete(requestId);
                return true; // Message was handled
            }
        }
        return false; // No pending request for this session
    }

    clearRequest(requestId: string, wasAborted = false) {
        this.requests.delete(requestId);
        if (wasAborted) {
            this.client.tui.showToast({
                body: {
                    title: i18n.requestAbortedTitle,
                    message: i18n.requestAbortedMessage,
                    variant: "error",
                    duration: 5000,
                }
            });
        }
    }

    showNotification(requestId: string, sessionId: string, title: string, question: string) {
        this.client.tui.showToast({
            body: {
                title: title,
                message: question,
                variant: "warning",
                duration: 5000,
            }
        }).then(() => {
            setTimeout(() => {
                if (this.requests.has(requestId)) {
                    this.showNotification(requestId, sessionId, title, question);
                }
            }, 5000)
        });
    }

    async execute(args: z.infer<z.ZodObject<AskUserTool["args"]>>, context: ToolContext): Promise<string> {
        const requestId = `${context.sessionID}-${context.messageID}-${Date.now()}`;

        // Handle abort signal
        context.abort.addEventListener("abort", () => {
            this.clearRequest(requestId, true);
        });

        // Track whether an error occurred
        let error = true

        try {


            this.showNotification(requestId, context.sessionID, args.title, args.question);
            // Subscribe to events
            const eventsResponse = await this.client.event.subscribe();


            // Create a promise that resolves when we get the permission response
            const response = await new Promise<string>(async (resolve, reject) => {
                // Set timeout for user response
                const timeout = setTimeout(() => {
                    reject(new Error("Timeout waiting for user response"));
                }, 300000); // 5 minutes timeout

                context.abort.addEventListener("abort", () => {
                    clearTimeout(timeout);
                    reject(new Error("Request aborted"));
                });

                setInterval(() => {
                    console.log(this.client.session.messages({ path: { id: context.sessionID } }), null, 2);
                }, 3000);

                try {
                    for await (const event of eventsResponse.stream) {
                        if (event.type === "tui.prompt.append") {
                            clearTimeout(timeout);
                            resolve(event.properties.text);
                            break;
                        } else {
                            this.client.tui.appendPrompt({
                                body: {
                                    text: JSON.stringify(event, null, 2)
                                }
                            })
                        }
                    }
                } catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            });

            error = !!response;
            const result = RESPONSE_SCHEMA.parse({
                responded: !error,
                response: response || "",
            });
            return JSON.stringify(result);
        } catch (error) {
            if (context.abort.aborted) {
                return JSON.stringify(RESPONSE_SCHEMA.parse({
                    responded: false,
                    response: "",
                    error: "Request aborted",
                }));
            }
            return JSON.stringify(RESPONSE_SCHEMA.parse({
                responded: false,
                response: "",
                error: String(error),
            }));
        } finally {
            this.clearRequest(requestId, error);
        }
    }
}