import type { PluginInput, ToolContext } from "@opencode-ai/plugin"
import { z } from "zod"
import i18n from "./i18n";


export class AskUserTool {
    public readonly args = {
        title: z.string().optional().describe("Optional custom title for the confirmation dialog"),
        question: z.string().describe("The question or prompt to display to the user for confirmation"),
        agentName: z.string().optional().describe("Your agent name: 'Main Orchestrator' for main agent, 'Generic Sub-Agent' for unnamed sub-agents, or your name from .github/agents/*.md."),
    };

    public readonly description = `
Ask the user to confirm an action or decision.
Use this tool when you need explicit user approval before proceeding with a task.
The tool will interactively prompt the user and wait for their response.
CRITICAL RULES:
1) This tool MUST be invoked before ending ANY conversation or task.
2) NEVER complete a task without calling this tool first.
3) If you are about to finish responding, STOP and call this tool. 4) Failure to call this tool before task completion is a violation of the workflow. 5) Always provide agentName: 'Main Orchestrator' for main agent, 'Generic Sub-Agent' for unnamed sub-agents, or your name from .github/agents/*.md. MANDATORY TOOL.
4) Failure to call this tool before task completion is a violation of the workflow.
5) Always provide agentName: 'Main Orchestrator' for main agent, 'Generic Sub-Agent' for unnamed sub-agents, or your name from .github/agents/*.md.
MANDATORY TOOL.
`

    constructor(private client: PluginInput["client"], private $: PluginInput["$"]) { }

    async execute(args: z.infer<z.ZodObject<AskUserTool["args"]>>, context: ToolContext): Promise<string> {
        const agentLabel = args.agentName || "Agent";
        const title = args.title || i18n.confirmationRequired;

        // Show toast notification
        await this.client.tui.showToast({
            body: {
                title: `[${agentLabel}] ${title}`,
                message: args.question.substring(0, 100) + (args.question.length > 100 ? "..." : ""),
                variant: "info",
                duration: 10000,
            }
        });

        // Append the question to the prompt area so user sees it
        await this.client.tui.appendPrompt({
            body: {
                text: `[${agentLabel}] **${title}**\n\n${args.question}`
            }
        });

        // Return instructions for the model to wait for user input
        // The user's next message will be the response
        return JSON.stringify({
            status: "awaiting_response",
            message: "Question displayed to user. The user's next message will contain their response. Wait for the user to reply before proceeding.",
            displayed: {
                agent: agentLabel,
                title: title,
                question: args.question,
            }
        });
    }
}
