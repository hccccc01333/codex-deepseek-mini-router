import argparse
import contextlib
import json
import os
import re

exp = os.path.dirname(os.path.abspath(__file__))
os.environ.setdefault(
    "BIGCODEBENCH_OVERRIDE_PATH",
    os.path.join(exp, "bcb-data", "bigcodebench-v0.1.4.jsonl"),
)

import bigcodebench.eval as bcb_eval
import bigcodebench.eval.utils as bcb_utils

@contextlib.contextmanager
def safe_environment_windows():
    yield

@contextlib.contextmanager
def time_limit_windows(seconds):
    yield

def reliability_guard_windows(max_as_limit, max_data_limit, max_stack_limit):
    import os, time
    os.environ["TZ"] = "UTC"
    if hasattr(time, "tzset"):
        time.tzset()
    os.environ["OMP_NUM_THREADS"] = "1"
    os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
    os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
    try:
        import faulthandler
        faulthandler.disable()
    except Exception:
        pass
    import builtins
    builtins.exit = None
    builtins.quit = None

for mod in (bcb_eval, bcb_utils):
    mod.safe_environment = safe_environment_windows
    mod.time_limit = time_limit_windows
    mod.reliability_guard = reliability_guard_windows

from bigcodebench.evaluate import evaluate

def sanitize(code):
    if "```" in code:
        blocks = re.findall(r"```(?:python)?\s*\n(.*?)```", code, re.S)
        if blocks:
            return max(blocks, key=len).strip() + "\n"
    return code.strip() + "\n"

def collect(arm, tags, ids):
    tag_key = "-".join(tags)
    samples_path = os.path.join(exp, f"samples-{arm}-{tag_key}-codex.jsonl")
    with open(samples_path, "w", encoding="utf-8") as out:
        for tid in ids:
            safe = tid.replace("/", "__")
            sol = None
            used = None
            for tag in tags:
                cand = os.path.join(exp, "runs-bcb-codex", safe, arm, tag, "workspace", "solution.py")
                if os.path.exists(cand):
                    sol = cand
                    used = tag
                    break
            if not sol or not os.path.exists(sol):
                raise SystemExit(f"missing solution for {tid} under tags {tags}")
            with open(sol, encoding="utf-8") as f:
                code = sanitize(f.read())
            out.write(json.dumps({"task_id": tid, "solution": code, "used_tag": used}) + "\n")
    return samples_path, ids, tag_key

def run_eval(arm, tags, ids):
    samples, ids, tag_key = collect(arm, tags, ids)
    stale = samples.replace(".jsonl", "_eval_results.json")
    if os.path.exists(stale):
        os.remove(stale)
    stale_pk = samples.replace(".jsonl", "_pass_at_k.json")
    if os.path.exists(stale_pk):
        os.remove(stale_pk)
    print("evaluating", arm)
    evaluate(
        split="v0.1.4",
        subset="complete",
        samples=samples,
        execution="local",
        parallel=1,
        pass_k="1",
        calibrated=False,
        no_gt=True,
        selective_evaluate=ids,
        save_pass_rate=False,
    )
    with open(stale, encoding="utf-8") as f:
        results = json.load(f)
    per = {}
    for task_id, evals in results.get("eval", {}).items():
        per[task_id] = [e.get("status") for e in evals]
    summary = {tid: per.get(tid) for tid in ids}
    with open(os.path.join(exp, f"bcb-codex-results-{arm}-{tag_key}.json"), "w", encoding="utf-8") as f:
        json.dump({"per_task": per, "pass_count": sum(1 for v in summary.values() if v and v[0] == "pass")}, f, indent=2)
    print(arm, "pass:", json.dumps(summary))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--arms", nargs="+", default=["baseline", "static", "router"])
    parser.add_argument("--tag", default="r1", help="comma-separated fallback tags, first existing wins")
    parser.add_argument("--tasks", default="", help="comma-separated task ids; default is all tasks in bcb-data/sample-tasks.json")
    args = parser.parse_args()
    if args.tasks:
        ids = [t.strip() for t in args.tasks.split(",") if t.strip()]
    else:
        ids = json.load(open(os.path.join(exp, "bcb-data", "sample-tasks.json"), encoding="utf-8"))
    for arm in args.arms:
        run_eval(arm, [t for t in args.tag.split(",") if t], ids)
    print("DONE")
