# DeepSeek Mini-Router (Codex plugin)

给 Codex 里的 DeepSeek 模型（deepseek-v4-pro / deepseek-v4-flash）注入「任务感知
思维模式」的本地插件。安装 id 为 `deepseek-minimal-anchor`（继承 v1 名字，避免破坏
已有安装）；仓库名沿用 Mini-Router 的公开名称。

## 它做什么

在首轮模型请求前，从外部决定推理模式并注入匹配的 persona（模型不能自路由）：

- `spec`（默认，Pro + 维护/修复类任务）：先读文件、复现失败、计划最小改动，再动手；
- `react`（Pro + 新建/构建类任务）：直接产出可运行结果，再用检查验证；
- `flash`（模型 slug 含 flash 自动启用）：weak persona + 分类/回顾/反跑题/深度思考/
  决策闭环五锚。

模式按会话锁定（`session-modes.json`），中途不翻转；每轮按任务复杂度注入「快收敛」
或「决策闭环」引导。Codex 隐藏思维链，所以验证靠可见行为：回复次数、收尾摘要结构、
工具调用节奏、以及审计日志 `~/.codex/deepseek-minimal-anchor-reports/hook-log.jsonl`
（每次注入带 mode/source/complexity）。

## 安装

```sh
git clone <repo-url>
cd deepseek-mini-router
codex plugin marketplace add .
codex plugin add deepseek-minimal-anchor@deepseek-mini-router
```

依赖：本机 Node.js；Codex 已配置 DeepSeek provider（官方支持 Responses API 接入）。
首次使用需审查并信任钩子。

环境变量：

- `DEEPSEEK_MINIMAL_ANCHOR=always|never` —— 强制对所有模型注入 / 彻底禁用
- `DEEPSEEK_MINIMAL_ANCHOR_MODE=auto|spec|react|flash` —— 路由模式

## 开发

```sh
npm test          # node --test tests/v2/（路由分类、模式锁定、钩子行为）
```

覆盖文本（放在插件根目录，存在即覆盖默认值）：`anchor.txt`（spec persona）、
`react.txt`、`flash.txt`、`maintenance.txt`（基础维护引导）、`deep.txt`（深度锚后缀）。

## 诚实的状态说明

- **机制已验证**：注入送达、模式分类、会话锁定、审计日志均通过单元/钩子测试与真实
  CLI 会话冒烟。
- **效果未证实**：v1 微任务 A/B 显示锚定改变行为风格（可见回复变少、工具调用变多），
  但任务分无差异（任务太简单，天花板效应）。mini-router 的设计来自社区实测
  （dsh-router-standard 的 spec/react 行为带），但**在 Codex 里的分数收益尚无数据**。
  计划用 BigCodeBench 6 任务子集做三臂对照（官方基线 / v1 静态锚定 / v2 路由）来回答
  这个问题；跑完会把结果更新到本 README。

## 授权

MIT（LICENSE）。设计与人设文本参考 dsh-router-standard、dsh-anchored-standard 与
modeltest（均 MIT，详见 NOTICE.md）。社区产物，与 DeepSeek、OpenAI 无隶属关系。
