import { tool, type Plugin } from "@opencode-ai/plugin"


import { AskUserTool } from "./tool";


export const SeamlessAgent: Plugin = async ({ client, $ }) => {
    const askUser = tool(new AskUserTool(client, $));
    return {
        tool: { askUser }
    }
}