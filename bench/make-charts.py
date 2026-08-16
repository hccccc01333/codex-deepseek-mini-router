"""Generate the evidence charts for the DeepSeek Mini-Router README.

Run from the bench/ directory with the bcb-venv python (has matplotlib):
    python bench/make-charts.py

Writes PNGs into docs/.
"""

import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

here = os.path.dirname(os.path.abspath(__file__))
docs = os.path.join(os.path.dirname(here), "docs")
os.makedirs(docs, exist_ok=True)

BLUE = "#1e6fff"
PURPLE = "#7b3ff2"
GRAY = "#8a94a6"
GREEN = "#16a34a"
RED = "#dc2626"


def save(fig, name):
    path = os.path.join(docs, name)
    fig.savefig(path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print("wrote", path)


# ---------------------------------------------------------------------------
# Chart 1: pass rate by arm
# ---------------------------------------------------------------------------
arms = [
    "Flash baseline\n(n=2)",
    "Flash router v0\n(n=2)",
    "Flash router v4\n(n=3)",
    "Pro baseline\n(n=1)",
    "Pro static-spec\n(n=1)",
    "Pro router\n(n=1)",
]
rates = [8 / 12, 10 / 12, 16 / 18, 5 / 6, 4 / 6, 5 / 6]
colors = [GRAY, BLUE, GREEN, BLUE, RED, BLUE]

fig, ax = plt.subplots(figsize=(9.5, 4.8), dpi=160)
bars = ax.bar(arms, [r * 100 for r in rates], color=colors, width=0.62)
for bar, rate in zip(bars, rates):
    ax.text(
        bar.get_x() + bar.get_width() / 2,
        bar.get_height() + 1.2,
        f"{rate * 100:.0f}%",
        ha="center",
        fontsize=10,
        fontweight="bold",
    )
ax.set_ylim(0, 108)
ax.set_ylabel("Pass rate (%)")
ax.set_title(
    "DeepSeek Mini-Router: pass rate by arm\n"
    "BigCodeBench v0.1.4 complete, 6-task subset (deepseek-v4-pro / v4-flash)",
    fontweight="bold",
    fontsize=11,
)
ax.spines[["top", "right"]].set_visible(False)
ax.tick_params(axis="x", labelsize=8.5)
save(fig, "pass-rate-by-arm.png")


# ---------------------------------------------------------------------------
# Chart 2: per-task pass-rate heatmap
# ---------------------------------------------------------------------------
rows = [
    "Flash baseline (n=2)",
    "Flash router v4 (n=3)",
    "Pro baseline (n=1)",
    "Pro static-spec (n=1)",
    "Pro router (n=1)",
]
cols = ["150", "33", "736", "747", "874", "900"]
matrix = np.array(
    [
        [0.0, 1.0, 0.0, 1.0, 1.0, 1.0],
        [2 / 3, 1.0, 2 / 3, 1.0, 1.0, 1.0],
        [0.0, 1.0, 1.0, 1.0, 1.0, 1.0],
        [0.0, 1.0, 0.0, 1.0, 1.0, 1.0],
        [0.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    ]
)
labels = [
    ["0/2", "2/2", "0/2", "2/2", "2/2", "2/2"],
    ["2/3", "3/3", "2/3", "3/3", "3/3", "3/3"],
    ["0/1", "1/1", "1/1", "1/1", "1/1", "1/1"],
    ["0/1", "1/1", "0/1", "1/1", "1/1", "1/1"],
    ["0/1", "1/1", "1/1", "1/1", "1/1", "1/1"],
]

fig, ax = plt.subplots(figsize=(8.2, 4.2), dpi=160)
im = ax.imshow(matrix, cmap="RdYlGn", vmin=0, vmax=1)
ax.set_xticks(range(len(cols)), cols)
ax.set_yticks(range(len(rows)), rows, fontsize=9)
for i in range(len(rows)):
    for j in range(len(cols)):
        ax.text(j, i, labels[i][j], ha="center", va="center", fontsize=10, fontweight="bold")
ax.set_title(
    "Per-task pass rate (green = pass, red = fail)\n"
    "task 150 is the stable hard case; 736 separates the arms",
    fontweight="bold",
    fontsize=10.5,
)
save(fig, "per-task-heatmap.png")


# ---------------------------------------------------------------------------
# Chart 3: reasoning-style metrics by persona variant
# ---------------------------------------------------------------------------
variants = ["v0\n10/12", "v1\n5/6", "v2\n4/6", "v3\n3/6", "v4\n16/18", "v5\n4/6", "v6\n10/12"]
letme = [5.0, 0.0, 9.7, 0.0, 1.1, 1.0, 8.75]
we = [8.0, 12.0, 5.8, 18.1, 13.2, 6.0, 0.3]
decide = [0.83, 1.67, 1.67, 0.9, 1.22, 1.33, 1.17]
chars = [6779, 8117, 9302, 10388, 7559, 5112, 5244]
x = np.arange(len(variants))

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4.4), dpi=160)
w = 0.36
b1 = ax1.bar(x - w / 2, letme, w, label="let me / run", color=RED, alpha=0.85)
b2 = ax1.bar(x + w / 2, we, w, label="we / run", color=PURPLE, alpha=0.85)
for bars in (b1, b2):
    for bar in bars:
        ax1.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + 0.15,
            f"{bar.get_height():.1f}",
            ha="center",
            fontsize=7.5,
        )
ax1.set_xticks(x, variants, fontsize=8)
ax1.set_ylabel("count per run")
ax1.set_title("Reasoning style: let-me vs we (fingerprints, not proof)", fontweight="bold", fontsize=10)
ax1.legend(fontsize=8)
ax1.spines[["top", "right"]].set_visible(False)

b3 = ax2.bar(x - w / 2, decide, w, label="decision markers / run", color=BLUE, alpha=0.9)
ax2.set_xticks(x, variants, fontsize=8)
ax2.set_ylabel("decision markers per run", color=BLUE)
ax2.tick_params(axis="y", labelcolor=BLUE)
ax2.spines[["top"]].set_visible(False)
ax3 = ax2.twinx()
ax3.plot(x, chars, marker="o", color=GREEN, linewidth=2, label="reasoning chars / run")
ax3.set_ylabel("reasoning chars / run", color=GREEN)
ax3.tick_params(axis="y", labelcolor=GREEN)
ax2.set_title("Decision density and reasoning volume (v4 wins on outcome)", fontweight="bold", fontsize=10)
lines, labels = ax2.get_legend_handles_labels()
lines2, labels2 = ax3.get_legend_handles_labels()
ax2.legend(lines + lines2, labels + labels2, fontsize=8, loc="upper left")
save(fig, "thinking-metrics.png")
