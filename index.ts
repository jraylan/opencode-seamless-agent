import { tool, type Plugin } from "@opencode-ai/plugin"


import { AskUserTool } from "./tool";


export const SeamlessAgent: Plugin = async ({ client, $ }) => {
    const askUserTool = new AskUserTool(client, $);
    const askUser = tool(askUserTool);

    return {
        tool: { askUser }
    }
}