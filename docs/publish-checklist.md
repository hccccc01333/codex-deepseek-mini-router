# 官方 Plugins Directory 提交包（Publish Checklist）

目标：把 DeepSeek Mini-Router 提交进 ChatGPT + Codex 共用的官方 Plugins
Directory。本文档是提交前的一次性核对清单和素材包，随仓库维护。

## 当前状态

| 项目 | 状态 |
| --- | --- |
| 公开仓库 | ✅ `hccccc01333/codex-deepseek-mini-router` |
| 根插件清单 `.codex-plugin/plugin.json` | ✅ 0.2.0 |
| 图标 `assets/icon.svg` | ✅ SVG，512×512 |
| 截图 | ✅ `docs/pass-rate-by-arm.png` 等三张 |
| `LICENSE`（MIT） | ✅ 仓库根 + 插件目录 |
| `SECURITY.md` | ✅ 仓库根 + 插件目录 |
| 隐私政策 `docs/privacy.md` | ✅ |
| 服务条款 `docs/terms.md` | ✅ |
| HOL 扫描 | ✅ 100/100，CI 绿 |
| 5 正 + 3 负测试用例 | ✅ 见下文 |
| 已验证的开发者/企业身份 | ❌ 需要你在提交门户完成认证 |
| Apps Management 写权限 | ❌ 需要申请开通 |

## 产品命名

- 插件机器名（不变）：`deepseek-minimal-anchor`
- 目录显示名：**DeepSeek Mini-Router**
- 分类：Productivity
- 开发者：Hzz（身份认证后按门户要求填写实名/企业名）

## 描述素材

短描述（EN）：
> Task-aware spec/react/flash working contract for DeepSeek models in Codex.

短描述（中文）：
> 给 Codex 里的 DeepSeek 模型注入任务感知的 spec/react/flash 工作契约。

长描述（EN，提交表单用）：
> DeepSeek models are highly sensitive to the agent scaffold and the
> first-visible persona. This plugin classifies each task (spec: plan-and-fix,
> react: build-and-verify), locks the mode per session, and injects the
> matching persona at session start. DeepSeek Flash gets a separate
> decide-and-verify contract. Delivery is dual-channel: trusted hooks inject
> the contract as developer context on desktop and CLI; a bundled skill is the
> self-executing fallback. Every injection is written to a local audit log.

长描述（中文）：
> DeepSeek 模型对脚手架和首轮可见的 persona 高度敏感。本插件按任务分类
> （spec：先读后修；react：先建后验），在会话内锁定模式并注入匹配的
> persona；Flash 使用独立的「决策 + 验证」契约。双通道交付：信任后的钩子在
> 桌面端和 CLI 注入 developer 上下文；内置技能兜底。每次注入都写入本地审计日志。

## URL 清单

| 用途 | URL |
| --- | --- |
| Website | https://github.com/hccccc01333/codex-deepseek-mini-router |
| Support | https://github.com/hccccc01333/codex-deepseek-mini-router/issues |
| Privacy | https://github.com/hccccc01333/codex-deepseek-mini-router/blob/main/docs/privacy.md |
| Terms | https://github.com/hccccc01333/codex-deepseek-mini-router/blob/main/docs/terms.md |
| Icon | `assets/icon.svg`（随包提交） |
| Screenshots | `docs/pass-rate-by-arm.png`、`docs/per-task-heatmap.png`、`docs/thinking-metrics.png` |

## 5 个正向测试用例

1. **修复/维护任务 → spec 模式**
   新线程 + `deepseek-v4-pro`，给一个带失败复现步骤的 bug 修复任务。期望：
   审计日志出现 `UserPromptSubmit` 注入且模式为 `spec`；`session-modes.json`
   锁定 `spec`。
2. **新建/构建任务 → react 模式**
   新线程 + `deepseek-v4-pro`，给一个「按规格实现新功能」的任务。期望：
   注入模式为 `react`；会话锁定不变。
3. **Flash 模型 → decide & verify**
   新线程 + `deepseek-v4-flash`，任意任务。期望：注入 Flash persona，文本含
   「decide & verify」标记。
4. **生效自检**
   新线程 + DeepSeek 模型，问「mini-router 生效了吗」。期望：助手读取审计日志
   回答通道（钩子/技能）与模式，而非猜测。
5. **环境变量强制**
   `DEEPSEEK_MINIMAL_ANCHOR=always` + 非 DeepSeek 模型。期望：仍注入契约
   （强制通道生效）。

## 3 个负向测试用例

1. **禁用开关**
   `DEEPSEEK_MINIMAL_ANCHOR=never` + DeepSeek 模型。期望：无任何注入，审计日志
   在该会话下为空。
2. **模型门控**
   默认 GPT 模型 + 未设置环境变量。期望：不注入，日志为空。
3. **会话内不翻转**
   先触发 `spec` 锁定，再在同一线程提一个构建任务。期望：
   `session-modes.json` 仍为 `spec`，不中途改 `react`。

## 提交包（ZIP）构建

官方表单要求扁平插件包，取插件目录内容（不是整个仓库）：

```powershell
$src = "D:\deepseek-mini-router\plugins\deepseek-minimal-anchor"
Compress-Archive -Path "$src\*" -DestinationPath "$env:TEMP\deepseek-mini-router-0.2.0.zip"
```

ZIP 根目录必须包含：

- `.codex-plugin/plugin.json`（0.2.0，displayName = DeepSeek Mini-Router）
- `skills/minimal-anchor/SKILL.md`（至少一个技能）
- `hooks/hooks.json` + `scripts/`（钩子通道）
- `assets/icon.svg`、`assets/screenshot.png`
- `LICENSE`、`README.md`、`SECURITY.md`、`NOTICE.md`、`package-lock.json`

## 本地自检命令

```powershell
cd plugins/deepseek-minimal-anchor
npm test                                              # 14 个测试
& "$env:APPDATA\Python\Python314\Scripts\plugin-scanner.exe" scan "D:\deepseek-mini-router" --format text
# 期望 Final Score 100/100，critical/high/medium/low/info 全为 0
```

## 提交流程

1. 在插件提交门户完成开发者身份认证，并开通 Apps Management 写权限。
2. 新建提交，选择 **Skills only**（我们的插件以技能为目录形态，钩子随包分发）。
3. 上传 ZIP，填名称/描述/URL/分类/图标/截图/启动提示词（defaultPrompt 已备）。
4. 粘贴 5 正 + 3 负测试用例及预期结果。
5. 提交审核 → 通过后在门户点 Publish → 出现在统一 Plugins Directory。

## 风险提示

- 官方表单明确覆盖 skills 与 MCP；钩子（hooks）作为插件能力随包分发是官方支持的，
  但审核员是否会额外关注钩子尚无公开先例，如被要求说明，引用
  [Package your plugin](https://developers.openai.com/plugins/build/plugins) 的
  hooks 章节即可。
- 本插件是社区项目，与 DeepSeek、OpenAI 无隶属关系，提交时如实声明。
