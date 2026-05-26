# Registers a Windows Scheduled Task that runs run-cycle.ps1 every 2 hours.
# Run once manually:  powershell -NoProfile -ExecutionPolicy Bypass -File .\register-task.ps1
# Re-running is idempotent — it unregisters the existing task first.

$ErrorActionPreference = 'Stop'

$taskName = 'VBL-Playwright-E2E-Cycle'
$scriptDir = $PSScriptRoot
$runScript = Join-Path $scriptDir 'run-cycle.ps1'

if (-not (Test-Path $runScript)) {
    Write-Error "run-cycle.ps1 not found at $runScript"
    exit 1
}

Write-Host "Registering task '$taskName' → $runScript"

try {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction Stop
    Write-Host 'Previous task removed.'
} catch {
    Write-Host 'No previous task (first install).'
}

$action = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runScript`""

$trigger = New-ScheduledTaskTrigger `
    -Once -At ((Get-Date).AddMinutes(2)) `
    -RepetitionInterval (New-TimeSpan -Hours 2)

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description 'VBL Playwright E2E full cycle: reset docker stack + run suite. Logs: test/playwright/logs/.'

Write-Host "Task '$taskName' registered. Next run: $((Get-Date).AddMinutes(2).ToString('o'))"
Write-Host 'View it: Get-ScheduledTask -TaskName VBL-Playwright-E2E-Cycle | Format-List *'
