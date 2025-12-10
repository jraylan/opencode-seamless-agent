import type { PluginInput, ToolContext } from "@opencode-ai/plugin"
import { z } from "zod"
import i18n from "./i18n";



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

    async execute(args: z.infer<z.ZodObject<AskUserTool["args"]>>, context: ToolContext): Promise<string> {
        const requestId = `${context.sessionID}-${context.messageID}-${Date.now()}`;

        // Show toast notification
        this.client.tui.showToast({
            body: {
                title: i18n.confirmationRequired,
                message: args.title,
                variant: "info",
                duration: 5000,
            }
        });

        // Create a promise that will be resolved when the user responds
        const userResponsePromise = new Promise<string>((resolve, reject) => {
            this.requests.set(requestId, { resolve, reject });

            // Handle abort signal
            context.abort.addEventListener("abort", () => {
                this.requests.delete(requestId);
                reject(new Error("Request aborted"));
            });
        });

        // Inject the question message into the chat (not the input area)
        // Using session.prompt with noReply to display in chat without AI response
        await this.client.session.prompt({
            path: { id: context.sessionID },
            body: {
                noReply: true,
                parts: [
                    {
                        type: "text",
                        text: `**${args.title}**\n\n${args.question}\n\n> Please type your response below:`
                    }
                ]
            }
        });

        return JSON.stringify({
            "response": "Wait for the user's next input message to proceed."
        })
    }
}