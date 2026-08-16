# DeepSeek Mini-Router (Codex plugin)

Task-aware **spec / react / flash** working-contract plugin for DeepSeek models
inside Codex. It classifies each task, locks a mode per session, and injects
the matching persona as developer context - via hooks on desktop and CLI, with
the bundled skill as a self-checking fallback.

Measured on a 6-task BigCodeBench subset (deepseek-v4-flash):
**baseline 8/12 -> router (v0) 10/12 -> router (v4, current persona) 16/18**.
Full methodology, per-task matrix, and honest limits:
[docs/evidence.md](docs/evidence.md). Reproducible harness:
[bench/](bench/README.md).

## Quick start

```sh
git clone https://github.com/hccccc01333/deepseek-mini-router
cd deepseek-mini-router
codex plugin marketplace add .
codex plugin add deepseek-minimal-anchor@deepseek-mini-router
```

Then:

1. Trust the hooks once (app plugin settings, or `/hooks` in the CLI). Trust is
   hash-keyed: after a plugin update, re-trust and start a new thread.
2. Open a new thread with a DeepSeek model - the contract applies automatically.
3. Ask *"Is the mini-router active?"* any time; the assistant answers from the
   audit log (`~/.codex/deepseek-minimal-anchor-reports/hook-log.jsonl`).

Environment:

- `DEEPSEEK_MINIMAL_ANCHOR=always|never` - force / disable
- `DEEPSEEK_MINIMAL_ANCHOR_MODE=auto|spec|react|flash` - route manually

## How it works

| Mode | Trigger | Contract |
| --- | --- | --- |
| spec | Pro + maintenance/fix tasks | read first, reproduce the failure, plan the smallest change, then edit |
| react | Pro + build/create tasks | produce the working result directly, then verify |
| flash | auto for `deepseek-v4-flash` | decide & verify: decide task type in one step, end each reasoning block with a decision or an information need, run a concrete check after writing, retry once on failure |

The mode is locked per session and never flipped mid-session. Per-turn guidance
adapts to task complexity (decision-closure deep anchor for complex tasks).
Every injection is written to the audit log; when hooks are not running, the
skill carries the same contract and the assistant says which channel is active.

## Evidence

![Pass rate by arm](docs/pass-rate-by-arm.png)

![Per-task pass-rate heatmap](docs/per-task-heatmap.png)

![Reasoning-style metrics by persona variant](docs/thinking-metrics.png)

Core numbers (BigCodeBench v0.1.4, 6-task subset, local scoring):

| Arm | Pass rate |
| --- | --- |
| Flash baseline (no plugin, n=2) | 8/12 (67%) |
| Flash router v0 five-anchor (n=2) | 10/12 (83%) |
| Flash router v4 decide & verify (n=3) | **16/18 (89%)** |
| Pro baseline (n=1) | 5/6 (83%) |
| Pro static-spec forced (n=1) | 4/6 (67%) |
| Pro router (n=1) | 5/6 (83%) |

Seven persona variants were screened; v4 (decide & verify) is the only one that
beat v0. Reasoning text is extracted from session transcripts
(`reasoning_text`) and scored for decisions / verification / let-me / we.

Honest limits: small samples (n=1-3), a single "implement from spec"
benchmark (react side) - the spec/maintenance side is not yet measured in
Codex; phrasing ("I need" vs "let me") changes which task fails, not the pass
rate; third-party "beats Opus 4.8" claims are not endorsed by this project.

## Development

```sh
cd plugins/deepseek-minimal-anchor
npm test            # 14 unit + hook tests
```

Benchmark reproduction: see [bench/README.md](bench/README.md).
Charts: `python bench/make-charts.py`.

## License

MIT ([LICENSE](LICENSE)). Design and persona wording reference
dsh-router-standard, dsh-anchored-standard, and modeltest (MIT, see
[NOTICE.md](plugins/deepseek-minimal-anchor/NOTICE.md)). Community project,
not affiliated with DeepSeek or OpenAI.

---

# DeepSeek Mini-Router（中文说明）

给 Codex 里的 DeepSeek 模型（deepseek-v4-pro / deepseek-v4-flash）注入「任务感知
思维模式」的插件。按任务分类、会话内锁定模式，并通过钩子注入匹配的 persona；
桌面应用钩子不可用时由内置技能兜底，会话会主动说明当前走哪条通道。

## 快速开始

```sh
git clone https://github.com/hccccc01333/deepseek-mini-router
cd deepseek-mini-router
codex plugin marketplace add .
codex plugin add deepseek-minimal-anchor@deepseek-mini-router
```

1. 信任钩子一次（应用插件设置或 CLI 的 `/hooks`）；信任按哈希绑定，插件更新后需
   重新信任并开新线程。
2. 新线程 + DeepSeek 模型，契约自动生效。
3. 随时问「mini-router 生效了吗」，助手会读审计日志回答
   （`~/.codex/deepseek-minimal-anchor-reports/hook-log.jsonl`）。

环境变量：`DEEPSEEK_MINIMAL_ANCHOR=always|never`；`DEEPSEEK_MINIMAL_ANCHOR_MODE=auto|spec|react|flash`。

## 模式

- `spec`（Pro + 维护/修复）：先读文件、复现失败、计划最小改动，再动手；
- `react`（Pro + 新建/构建）：直接产出可运行结果，再用检查验证；
- `flash`（deepseek-v4-flash 自动启用）：决策+验证——一步定任务类型、每个推理块
  以决策或信息需求收尾、写码后跑具体检查、失败重试一次。

模式会话内锁定；每轮按复杂度注入引导；全部注入写审计日志。

## 实测证据（可复现）

三张图见英文版上方。核心数字（BigCodeBench v0.1.4，6 任务子集，本地评分）：

| 臂 | 通过率 |
| --- | --- |
| Flash 基线（无插件，n=2） | 8/12（67%） |
| Flash 路由 v0 五锚（n=2） | 10/12（83%） |
| Flash 路由 v4 决策+验证（n=3） | **16/18（89%）** |
| Pro 基线（n=1） | 5/6（83%） |
| Pro 强制 spec（n=1） | 4/6（67%） |
| Pro 路由（n=1） | 5/6（83%） |

7 个 persona 变体筛选中，v4（决策+验证）是唯一超过 v0 的；思考链内容可从会话
transcript 的 `reasoning_text` 提取并打分。

诚实边界：样本小（n=1-3）、只测了「按规格实现」的 react 侧（spec 维护侧尚未在
Codex 里测）；措辞（I need vs let me）只换失败题不换总分；本项目不背书「超过
Opus 4.8」类第三方说法。完整方法见 [docs/evidence.md](docs/evidence.md)，
跑批见 [bench/](bench/README.md)。

## 开发 / 授权

`npm test`（14 个单测+钩子测试）；图表 `python bench/make-charts.py`。MIT 许可，
设计参考 dsh-router-standard、dsh-anchored-standard、modeltest（详见 NOTICE.md），
与 DeepSeek、OpenAI 无隶属关系。
