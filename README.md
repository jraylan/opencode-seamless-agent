# Seamless Agent

[![npm version](https://img.shields.io/npm/v/opencode-seamless-agent.svg)](https://www.npmjs.com/package/opencode-seamless-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A OpenCode CLI plugin that makes IA Agent require user confirmation before actions are executed. This adds an extra layer of safety and control to automated processes.

## NOTICE

This is a work in progress and still not ready for use. Check the vscode/antigravity version at [SeamlessAgent](https://github.com/jraylan/seamless-agent).

## Features

- ✅ **Action interception** - Captures IA Agent actions before execution
- ✅ **User confirmation** - Prompts for approval on each action
- ✅ **Seamless integration** - Works transparently with OpenCode CLI
- ✅ **Configurable behavior** - Customize confirmation prompts and rules

## Requirements

- **OpenCode SDK ≥ 1.0.126** - Required for agent context preservation and message insertion patterns

## Installation

Add to your `opencode.json` or `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["opencode-seamless-agente"]
}
```

OpenCode auto-installs plugins on startup.

### Version Pinning

Pin to a specific version:

```json
{
  "plugin": ["opencode-seamless-agente@x.y.z"]
}
```

### Plugin Updates

Check installed version:

```bash
cat ~/.cache/opencode/node_modules/opencode-seamless-agente/package.json | grep version
```

Force update to latest:

```bash
rm -rf ~/.cache/opencode
```

Then restart OpenCode.

## Quick Start

### 1. Install the Plugin

Add to your `opencode.json` or `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["opencode-seamless-agente"]
}
```

### 2. Restart OpenCode

The plugin will load and start intercepting IA Agent actions.

### 3. Use the IA Agent

Once installed, the `askUser` tool is automatically available to the IA Agent in OpenCode CLI.

### Recommended System Prompt

To ensure the AI always asks for your confirmation before completing tasks, add the following to your custom instructions or system prompt:

```
Always use the askUser tool before completing any task to confirm with the user that the request was fulfilled correctly.
```

You can add this into your OpenCode instructions file or project configuration.

### Usage

When the IA Agent use this tool, the following should happen:

1. A Notification will appears in the OpenCode CLI console
2. Type your response
3. The agent continues based on your input

## Troubleshooting

**Plugin not loading?**

- Verify plugin is listed in `opencode.json`
- Check console for loading errors
- Restart OpenCode after configuration changes

**No confirmation prompts?**

- Check if the model was correctly instructed to use the took.
- Ask to the agent if the tool askUser is available. If it's not, try reinstalling/updating the plugin

## Contributing

Contributions welcome! Fork, create a feature branch, and submit a PR.

## License

MIT - see [LICENSE](LICENSE)

## References

- [OpenCode Documentation](https://opencode.ai)

---

**Not affiliated with OpenAI or Anthropic.** This is an independent open-source project.
