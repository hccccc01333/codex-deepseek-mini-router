# Privacy

DeepSeek Mini-Router is a local Codex plugin. It does not collect telemetry,
analytics, or personal data.

What happens with your data:

- Prompts, tool calls, and responses are processed by the model provider you
  configure in Codex (for example, DeepSeek's official Responses API), under
  that provider's privacy policy.
- The plugin writes local audit logs and session-mode state under
  `~/.codex/deepseek-minimal-anchor-reports/` on your machine. These files are
  never uploaded anywhere by the plugin.
- Hooks run locally with the permissions granted when you trust them.

The repository does not contain secrets. If you believe a secret was exposed,
report it through the repository's Security Advisories (see
[SECURITY.md](../SECURITY.md)).
