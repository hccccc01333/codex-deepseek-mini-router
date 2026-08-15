# DeepSeek Mini-Router (Codex plugin, v2)

给 Codex 里的 DeepSeek 模型注入「任务感知思维模式」的本地插件。v1 是静态的 minimal
锚定；v2 升级为迷你路由：先分类任务（spec / react），锁定会话模式，注入匹配的
persona，再按任务复杂度给每轮引导，并把每次注入写进审计日志。

## 为什么

社区实验链（xiaobright/modeltest → dsh-anchored-standard → yjh051108/dsh-router-standard）
发现 DeepSeek 模型对首轮可见的 persona 高度敏感，且行为不是连续变化，而是塌缩成几个
稳定带：spec（计划-集体，修/维护任务的高分带）、mixed（陷阱，应回避）、react（执行者，
新建/构建任务的高分带）。persona 是主导触发器；Flash 模型是阈值式行为，需要单独的
weak persona（w7）加 分类/回顾/反跑题/深度思考/决策闭环 五个锚。模式选择必须来自外部
（模型不能自路由），这正是本插件做的事。

**诚实边界**：插件只能注入 developer 上下文，改不了 Codex 的系统提示和工具目录；
注入的是「模式」，不是「去除过拟合」。措辞是轨迹指纹，不是能力证明；router-standard
的分数差异来自其自测（n=2 级别），需要在自己的任务上复算。

## 模式路由（v2）

优先级：`DEEPSEEK_MINIMAL_ANCHOR_MODE` 环境变量 > 模型识别 > 任务分类器。

| 模式 | 谁触发 | persona 行为 |
| --- | --- | --- |
| spec | Pro + 维护/修复/计划类任务（默认） | 先读文件、复现失败、计划最小改动，再动手 |
| react | Pro + 新建/构建/跑代码类任务 | 直接产出可运行结果，再用检查验证 |
| flash | 模型 slug 含 flash | w7 weak 五锚：分类 + 回顾 + 反跑题 + 深度思考 + 决策闭环 |

任务分类器按关键词计分（spec 词 vs react 词），平局默认 spec；消息超过 800 字符或含
架构关键词（architecture / module / 集成 / 分布式 等）时，每轮引导追加「决策闭环」深
度锚（“Think deeply about architecture… end each reasoning block with a decision”）。

模式在会话内锁定（`session-modes.json`），避免中途翻转；SessionStart 没有首条消息时
先注入中性契约，第一条 UserPromptSubmit 再升级为分类后的 persona。

## 安装与启用

> ⚠️ **首次安装必须手动信任钩子**：Codex 的安全机制不允许插件自动信任自己的钩子。
> 未信任时只有技能会加载、注入不会执行，所以“装好了”不等于“生效了”。
> 另外，当前桌面应用构建可能根本不执行钩子（openai/codex#16430 类限制）；此时插件
> 自动走**技能通道**，工作契约依然生效，只是强度弱于钩子的强制 developer 注入。

1. 在 Codex 应用/CLI 安装插件（个人市场 **DeepSeek Mini-Router**，原名 minimal-anchor）。
   从仓库安装（开源场景）：

   ```sh
   git clone <repo-url> deepseek-mini-router
   codex plugin marketplace add deepseek-mini-router
   codex plugin add deepseek-minimal-anchor@deepseek-mini-router
   ```

2. 首次运行会要求审查并信任钩子。
   桌面应用：插件设置里审查并信任（或按首次弹窗提示）；CLI：交互模式输入 `/hooks`。
3. 使用 DeepSeek 模型（slug 含 `deepseek` 自动生效）。

依赖：本机需有 Node.js（钩子用 `node` 执行）；Codex 官方支持 DeepSeek 的
Responses 接入配置。

## 双通道与怎么知道开没开

插件有两条生效通道，内容相同：

- **CLI 通道（钩子）**：SessionStart/UserPromptSubmit 钩子把契约作为 developer
  上下文强制注入（优先级高）；需要信任钩子。
- **应用通道（技能）**：SKILL.md 是自执行契约，DeepSeek 会话里模型会自动按
  spec/react/flash 模式工作；无需信任、当前构建下唯一可靠通道，但属于指示性锚定。

新会话里直接问：“DeepSeek mini-router 生效了吗？”模型会读审计日志
（`~/.codex/deepseek-minimal-anchor-reports/hook-log.jsonl` 和
`session-modes.json`）回答：开了（模式 spec/react/flash + 来源）、还是没开
（钩子未信任 → 去插件设置信任，然后开新线程）。也可以自己看日志最后几行：
有新会话的 `SessionStart` 记录就是钩子通道生效；没有但模型按契约工作，就是技能
通道在生效——两种都算“开了”，模型会在会话里主动说明当前走的是哪条通道。

环境变量：

- `DEEPSEEK_MINIMAL_ANCHOR=always|never` —— 强制对所有模型注入 / 彻底禁用
- `DEEPSEEK_MINIMAL_ANCHOR_MODE=auto|spec|react|flash` —— 路由模式（默认 auto）

## 结构

```
.codex-plugin/plugin.json     插件清单（0.2.0）
hooks/hooks.json              三个生命周期钩子（SessionStart / UserPromptSubmit / SessionEnd）
scripts/common.mjs            路由核心：分类、模式锁定、persona、维护引导、审计
scripts/anchor-session.mjs    SessionStart：锁定模式并注入 persona（或中性契约）
scripts/maintain-mode.mjs     UserPromptSubmit：首轮 persona，之后按复杂度给引导
scripts/report-trajectory.mjs SessionEnd：轨迹指纹报告（含模式）
scripts/verify-trajectory.mjs 独立验证工具
skills/minimal-anchor/        技能文档
LICENSE / NOTICE.md           MIT 许可证与社区来源声明
tests/v2/                     路由逻辑与钩子功能测试（node --test）
anchor.txt / react.txt / flash.txt / maintenance.txt / deep.txt  （可选）覆盖文本
```

## 开源与授权

MIT 许可（见 LICENSE）。设计与人设文本参考了 dsh-router-standard、
dsh-anchored-standard 与 modeltest（MIT，详见 NOTICE.md）。本项目为社区产物，
与 DeepSeek、OpenAI 无隶属关系。欢迎提 PR：改 `scripts/common.mjs` 里的
分类词表/人设/引导，跑 `node --test tests/v2/` 后提交。

## 验证（不依赖思维链）

- 可见回复次数、收尾摘要 changed/verified/risks 完整度（0-3）、工具调用节奏；
- 审计日志 `~/.codex/deepseek-minimal-anchor-reports/hook-log.jsonl`：每次注入记录
  会话、模型、模式（spec/react/flash/neutral）、来源（env/model/classifier/maintenance）、
  复杂度、文本大小，SessionStart 额外记录 payload 字段名（方便调参）；
- 模式状态 `~/.codex/deepseek-minimal-anchor-reports/session-modes.json`；
- 会话报告 `<session-id>-<ts>.json` 含模式与轨迹统计；若网关透传 reasoning，
  `let me` / `we` 指纹顺带统计。

## 官方状态（2026-08-13 GA 之后）

DeepSeek-V4-Pro-0813 正式版原生支持 OpenAI Responses API 并官方适配 Codex。本插件是
官方配置之上的实验层：把提示面按任务推到对应的稳定行为带，并用可见行为验证。

## 卸载

在 Codex 插件设置里卸载插件即可；从仓库安装的，再执行
`codex plugin marketplace remove deepseek-mini-router`。本地开发残留的
marketplace 条目在 `~/.agents/plugins/marketplace.json`，可手动清理。
