# Claude Traffic Light — Connect to Claude Code (script du phong, Cach 2)
# Them 4 hooks vao ~/.claude/settings.json de Claude Code bao trang thai ve app.
# LUU Y: mirror logic cua desktop-app/hooksConfig.js — sua o do thi nho dong bo lai day.

$ErrorActionPreference = "Stop"

$claudeDir = Join-Path $env:USERPROFILE ".claude"
$settingsPath = Join-Path $claudeDir "settings.json"

if (-not (Test-Path $claudeDir)) {
  New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null
}

if (Test-Path $settingsPath) {
  $raw = Get-Content $settingsPath -Raw
  if ([string]::IsNullOrWhiteSpace($raw)) {
    $settings = New-Object PSObject
  } else {
    $settings = $raw | ConvertFrom-Json
  }
} else {
  $settings = New-Object PSObject
}

function New-HookCommand($status, $message) {
  $body = (@{ status = $status; message = $message } | ConvertTo-Json -Compress).Replace("'", "''")
  return "Invoke-RestMethod -Method Post -Uri http://localhost:7317/status -ContentType 'application/json' -Body '$body' -ErrorAction SilentlyContinue | Out-Null"
}

$hookDefs = [ordered]@{
  UserPromptSubmit = @(@{ hooks = @(@{ type = "command"; shell = "powershell"; command = (New-HookCommand "running" "Claude dang xu ly") }) })
  PreToolUse       = @(@{ matcher = ""; hooks = @(@{ type = "command"; shell = "powershell"; command = (New-HookCommand "running" "Dang chay tool") }) })
  Notification     = @(@{ hooks = @(@{ type = "command"; shell = "powershell"; command = (New-HookCommand "waiting" "Claude Code dang cho xac nhan") }) })
  Stop             = @(@{ hooks = @(@{ type = "command"; shell = "powershell"; command = (New-HookCommand "done" "Task da xong") }) })
}

if (-not $settings.PSObject.Properties["hooks"]) {
  $settings | Add-Member -MemberType NoteProperty -Name "hooks" -Value (New-Object PSObject)
}

foreach ($eventName in $hookDefs.Keys) {
  $newBlock = $hookDefs[$eventName]
  $newCommand = $newBlock[0].hooks[0].command

  if (-not $settings.hooks.PSObject.Properties[$eventName]) {
    $settings.hooks | Add-Member -MemberType NoteProperty -Name $eventName -Value @($newBlock)
  } else {
    $existing = @($settings.hooks.$eventName)
    $alreadyPresent = $false
    foreach ($block in $existing) {
      foreach ($h in @($block.hooks)) {
        if ($h.command -eq $newCommand) { $alreadyPresent = $true }
      }
    }
    if (-not $alreadyPresent) {
      $settings.hooks.$eventName = $existing + $newBlock
    }
  }
}

$settings | ConvertTo-Json -Depth 10 | Set-Content -Path $settingsPath -Encoding UTF8

Write-Host "Da ket noi Claude Traffic Light voi Claude Code!"
Write-Host "File: $settingsPath"
Write-Host "Hay khoi dong lai Claude Code de ap dung."
Read-Host "Nhan Enter de dong cua so nay"
