# Cluster Terminal: one-time installation for current Windows user.
param([switch]$NoLaunch)
$ErrorActionPreference='Stop'
$origin='https://xcxc84584-prog.github.io'
$source=Split-Path -Parent $MyInvocation.MyCommand.Path
$target=Join-Path $env:LOCALAPPDATA 'ClusterTerminalAgent\app'
$config=Join-Path $env:LOCALAPPDATA 'ClusterTerminalAgent'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 20+ is required: https://nodejs.org/en/download' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm is required. Install Node.js LTS.' }
if (-not (Test-Path (Join-Path $source 'server.cjs'))) { throw 'Installer must be next to server.cjs.' }
New-Item -ItemType Directory -Force -Path $config,$target | Out-Null
# Existing agent must be stopped before updating executable files.
$listener=Get-NetTCPConnection -LocalPort 43879 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  $proc=Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue
  $pidToStop=[int]$listener.OwningProcess
  $name=if($proc){$proc.Name}else{'Unknown'}
  Write-Warning "Port 43879 is occupied by PID $pidToStop ($name)."
  if($proc){Write-Host "Command line: $($proc.CommandLine)"}
  Write-Warning 'Force closing this process may terminate other tasks, including active PowerShell sessions.'
  $answer=Read-Host 'Force stop the process on port 43879 and continue installing? [y/N]'
  if($answer -notmatch '^(?i:y|yes)
}
$items=@('server.cjs','package.json','start-background.cmd','run-hidden.vbs','start-agent.cmd')
foreach($item in $items){Copy-Item -LiteralPath (Join-Path $source $item) -Destination (Join-Path $target $item) -Force}
$origin | Set-Content -LiteralPath (Join-Path $config 'origin.txt') -Encoding ascii
Push-Location $target
try { & npm install --omit=dev; if($LASTEXITCODE -ne 0){throw 'npm install failed'} } finally {Pop-Location}
$startup=[Environment]::GetFolderPath('Startup')
$shortcut=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $startup 'Cluster Terminal Agent.lnk'))
$shortcut.TargetPath=Join-Path $env:SystemRoot 'System32\wscript.exe'
$shortcut.Arguments='"'+(Join-Path $target 'run-hidden.vbs')+'"'
$shortcut.WorkingDirectory=$target
$shortcut.Save()
Write-Host "Installed to: $target" -ForegroundColor Green
Write-Host 'Auto-start enabled for the current Windows account.' -ForegroundColor Green
Write-Host 'Pairing token (keep private):' -ForegroundColor Yellow
Get-Content -LiteralPath (Join-Path $config 'pairing-token') -ErrorAction SilentlyContinue
if (-not $NoLaunch) {
  Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\wscript.exe') -ArgumentList ('"'+(Join-Path $target 'run-hidden.vbs')+'"') -WorkingDirectory $target
  Start-Sleep -Seconds 2
  if(Test-Path (Join-Path $config 'pairing-token')) {
    Write-Host 'PAIRING TOKEN:' -ForegroundColor Yellow
    Get-Content -LiteralPath (Join-Path $config 'pairing-token')
  } else {Write-Warning 'Agent may not have started. Check agent.log.'}
}
Write-Host 'Open https://xcxc84584-prog.github.io/Cluster/ then Terminal; paste token once and check Remember pairing.'
){throw 'Installation cancelled; existing process was not terminated.'}
  if($pidToStop -eq $PID){throw 'Refusing to terminate installer process.'}
  Stop-Process -Id $pidToStop -Force -ErrorAction Stop
  $released=$false
  for($attempt=0;$attempt -lt 30;$attempt++){
    Start-Sleep -Milliseconds 300
    $still=Get-NetTCPConnection -LocalPort 43879 -State Listen -ErrorAction SilentlyContinue
    if(-not $still){$released=$true;break}
  }
  if(-not $released){throw 'Port 43879 is still occupied. Installation aborted.'}
  Write-Host 'Port 43879 released. Continuing installation.' -ForegroundColor Green
}
$items=@('server.cjs','package.json','start-background.cmd','run-hidden.vbs','start-agent.cmd')
foreach($item in $items){Copy-Item -LiteralPath (Join-Path $source $item) -Destination (Join-Path $target $item) -Force}
$origin | Set-Content -LiteralPath (Join-Path $config 'origin.txt') -Encoding ascii
Push-Location $target
try { & npm install --omit=dev; if($LASTEXITCODE -ne 0){throw 'npm install failed'} } finally {Pop-Location}
$startup=[Environment]::GetFolderPath('Startup')
$shortcut=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $startup 'Cluster Terminal Agent.lnk'))
$shortcut.TargetPath=Join-Path $env:SystemRoot 'System32\wscript.exe'
$shortcut.Arguments='"'+(Join-Path $target 'run-hidden.vbs')+'"'
$shortcut.WorkingDirectory=$target
$shortcut.Save()
Write-Host "Installed to: $target" -ForegroundColor Green
Write-Host 'Auto-start enabled for the current Windows account.' -ForegroundColor Green
Write-Host 'Pairing token (keep private):' -ForegroundColor Yellow
Get-Content -LiteralPath (Join-Path $config 'pairing-token') -ErrorAction SilentlyContinue
if (-not $NoLaunch) {
  Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\wscript.exe') -ArgumentList ('"'+(Join-Path $target 'run-hidden.vbs')+'"') -WorkingDirectory $target
  Start-Sleep -Seconds 2
  if(Test-Path (Join-Path $config 'pairing-token')) {
    Write-Host 'PAIRING TOKEN:' -ForegroundColor Yellow
    Get-Content -LiteralPath (Join-Path $config 'pairing-token')
  } else {Write-Warning 'Agent may not have started. Check agent.log.'}
}
Write-Host 'Open https://xcxc84584-prog.github.io/Cluster/ then Terminal; paste token once and check Remember pairing.'
