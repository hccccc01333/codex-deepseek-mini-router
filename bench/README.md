# Benchmark harness (Codex + DeepSeek)

Self-contained scripts used for the evidence in `docs/evidence.md`.

## Layout

```
bench/
  run-bcb-codex-one.ps1   run one task/arm/tag through Codex CLI
  collect-codex-eval.py   score solutions with bigcodebench (local)
  analyze-thinking.mjs    extract reasoning_text and score thinking style
  make-charts.py          regenerate the docs/ PNG charts
  variants/               flash persona variants used in screening
  bcb-data/tasks/         the 6 TASK.md specs + sample-tasks.json
```

## Prerequisites

- Node.js (Codex hooks), a Codex installation with a DeepSeek provider
  (official Responses API), and a `DEEPSEEK_API_KEY`.
- Python 3.14 venv with: `bigcodebench==0.2.5` (install with `--no-deps` to
  avoid the vllm dependency), `numpy pandas scipy matplotlib tqdm jsonlines
  gradio_client e2b httpx termcolor datasets huggingface_hub tree-sitter
  tree_sitter_python transformers tempdir wget appdirs pqdm`.
- Dataset: place `bigcodebench-v0.1.4.jsonl` in `bench/bcb-data/`
  (download from the BigCodeBench HuggingFace repository), or set
  `BIGCODEBENCH_OVERRIDE_PATH` yourself.

## Run one arm

```powershell
.\run-bcb-codex-one.ps1 -TaskId 'BigCodeBench/150' -Arm baseline -Tag r1 -Model deepseek-v4-flash
.\run-bcb-codex-one.ps1 -TaskId 'BigCodeBench/150' -Arm router -Tag r1 -Model deepseek-v4-flash -Variant v4
```

`-Arm baseline` disables the plugin; `-Arm router` uses the auto mode;
`-Variant v4` swaps the flash persona via
`DEEPSEEK_MINIMAL_ANCHOR_OVERRIDE_DIR` without editing the plugin.

## Score

```powershell
python collect-codex-eval.py --arms baseline router --tag r1
```

## Thinking analysis

```powershell
node analyze-thinking.mjs runs-bcb-codex/BigCodeBench__150/router/r1
```

## Regenerate charts

```powershell
python make-charts.py
```
