param(
  [Parameter(Mandatory = $true)][string]$TaskId,
  [Parameter(Mandatory = $true)][string]$Arm,
  [Parameter(Mandatory = $true)][string]$Tag,
  [string]$Model = 'deepseek-v4-pro',
  [string]$Variant = ''
)
$ErrorActionPreference = 'Stop'
$exp = Split-Path -Parent $MyInvocation.MyCommand.Path
$taskSafe = $TaskId.Replace('/', '__')
$runDir = Join-Path $exp "runs-bcb-codex\$taskSafe\$Arm\$Tag"
if (Test-Path -LiteralPath $runDir) { throw "run dir already exists: $runDir" }
$ws = Join-Path $runDir 'workspace'
New-Item -ItemType Directory -Force -Path $ws | Out-Null

Copy-Item -Force -LiteralPath (Join-Path $exp "bcb-data\tasks\$taskSafe\TASK.md") -Destination (Join-Path $ws 'TASK.md')

$taskText = 'Read TASK.md in the current directory. Implement the required Python code and write ONLY the solution code (imports and definitions, no tests, no example calls, no if __name__ main block) to solution.py in the current directory. You may run python to check your code. Do not modify anything else. When done, write a short summary to RESULT.md describing what you implemented and how you verified it. Start working now; do not just give advice.'

$stdout = Join-Path $runDir 'events.jsonl'
$stderr = Join-Path $runDir 'stderr.txt'
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$codexArgs = @('exec', '--skip-git-repo-check', '--dangerously-bypass-approvals-and-sandbox', '--dangerously-bypass-hook-trust', '--json', '-C', $ws, '-m', $Model)
if ($Arm -eq 'baseline') {
  $env:DEEPSEEK_MINIMAL_ANCHOR = 'never'
} elseif ($Arm -eq 'static') {
  $env:DEEPSEEK_MINIMAL_ANCHOR_MODE = 'spec'
}
if ($Variant -ne '') {
  $env:DEEPSEEK_MINIMAL_ANCHOR_OVERRIDE_DIR = Join-Path $exp "variants\$Variant"
}
$codexArgs += $taskText
& codex @codexArgs 1> $stdout 2> $stderr
$code = $LASTEXITCODE
$sw.Stop()
Remove-Item Env:DEEPSEEK_MINIMAL_ANCHOR -ErrorAction SilentlyContinue
Remove-Item Env:DEEPSEEK_MINIMAL_ANCHOR_MODE -ErrorAction SilentlyContinue
Remove-Item Env:DEEPSEEK_MINIMAL_ANCHOR_OVERRIDE_DIR -ErrorAction SilentlyContinue

$summary = [ordered]@{
  taskId = $TaskId
  arm = $Arm
  tag = $Tag
  model = $Model
  variant = $Variant
  exitCode = $code
  elapsedSec = [Math]::Round($sw.Elapsed.TotalSeconds, 1)
  solutionExists = (Test-Path -LiteralPath (Join-Path $ws 'solution.py'))
}
$summary | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runDir 'run.json') -Encoding UTF8
Write-Output "bcb-codex complete: $TaskId / $Arm / $Tag / exit=$code / elapsed=$([Math]::Round($sw.Elapsed.TotalSeconds,1))s / solution=$($summary.solutionExists)"
