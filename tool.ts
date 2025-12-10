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

    private requests = new Map<string, Promise<string>>();

    constructor(private client: PluginInput["client"], private $: PluginInput["$"]) { }



    async execute(args: z.infer<z.ZodObject<AskUserTool["args"]>>, context: ToolContext): Promise<string> {
        const requestId = `${context.sessionID}-${context.messageID}-${Date.now()}`;

        // Unbound the abort signal from context
        const signal = new AbortController();
        context.abort.addEventListener("abort", () => {
            this.requests.delete(requestId);
            signal.abort()
        });
        const userResponse = this.promptUser(requestId, args, context, signal.signal);
        this.requests.set(requestId, userResponse);

        return await userResponse;
    }


    private async promptUser(
        requestId: string,
        args: z.infer<z.ZodObject<AskUserTool["args"]>>,
        context: ToolContext,
        abortSignal: AbortSignal
    ): Promise<string> {

        abortSignal.addEventListener("abort", () => {
            this.requests.delete(requestId);
        });

        this.client.tui.showToast({
            body: {
                title: i18n.confirmationRequired,
                message: args.title,
                variant: "info",
                duration: 400,
            }
        })

        await this.client.tui.appendPrompt({
            body: {
                text: `**${args.title}**\n${args.question}`
            }
        });

        const request = await this.client.tui.control.next()

        const error = request.error;
        if (error) {
            return JSON.stringify(RESPONSE_SCHEMA.parse({
                responded: false,
                response: "",
                error: String(error),
            }));
        }
        const userResponse = request.data || await request.response.text();

        const response = RESPONSE_SCHEMA.parse({
            responded: !!userResponse,
            response: userResponse || "",
        });

        return JSON.stringify(response)

    }


}