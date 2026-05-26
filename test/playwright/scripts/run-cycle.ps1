# Full reset + run cycle for the Playwright E2E suite.
# Invoked by Windows Scheduled Task "VBL-Playwright-E2E-Cycle" every 2 hours.
# Also runnable on-demand:  powershell -NoProfile -ExecutionPolicy Bypass -File .\run-cycle.ps1

$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
$playwrightDir = Split-Path -Parent $scriptDir
$repoRoot = Split-Path -Parent (Split-Path -Parent $playwrightDir)

$logDir = Join-Path $playwrightDir 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$logFile = Join-Path $logDir "$ts.log"
$latestSymlink = Join-Path $logDir 'latest.log'

function Log {
    param([string]$Msg)
    $line = "[$(Get-Date -Format o)] $Msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line -Encoding utf8
}

function Run {
    param([string]$Cmd)
    Log "RUN: $Cmd"
    $output = & cmd /c "$Cmd 2>&1"
    $exit = $LASTEXITCODE
    foreach ($line in $output) { Add-Content -Path $logFile -Value $line -Encoding utf8 }
    Log "EXIT: $exit"
    return $exit
}

Log "=== VBL Playwright cycle start ==="
Log "repoRoot=$repoRoot"
Log "playwrightDir=$playwrightDir"

Push-Location $repoRoot
try {
    Log 'Step 1/4 — reset stack (down -v + up --build)'
    Run 'docker compose -f docker-compose.dev.yml down -v'
    $upExit = Run 'docker compose -f docker-compose.dev.yml up -d --build'
    if ($upExit -ne 0) {
        Log 'FATAL: docker compose up failed'
        exit 10
    }

    Log 'Step 2/4 — wait backend healthy (max 90s)'
    $healthy = $false
    for ($i = 1; $i -le 30; $i++) {
        try {
            $r = Invoke-WebRequest -Uri 'http://localhost:4010/api/health' -UseBasicParsing -TimeoutSec 3
            if ($r.StatusCode -eq 200) {
                Log "backend healthy after $i attempts"
                $healthy = $true
                break
            }
        } catch {
            Start-Sleep -Seconds 3
        }
    }
    if (-not $healthy) {
        Log 'FATAL: backend never reported healthy'
        exit 11
    }

    Push-Location $playwrightDir
    try {
        if (-not (Test-Path 'node_modules')) {
            Log 'Step 3/4 — npm install + playwright browsers (first run)'
            Run 'npm install'
            Run 'npx playwright install chromium'
        } else {
            Log 'Step 3/4 — node_modules present, skip install'
        }

        Log 'Step 4/4 — npx playwright test'
        $testExit = Run 'npx playwright test'

        Copy-Item -Path $logFile -Destination $latestSymlink -Force
        Log "=== cycle end (exit=$testExit) ==="
        exit $testExit
    } finally {
        Pop-Location
    }
} finally {
    Pop-Location
}
