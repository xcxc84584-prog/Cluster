@echo off
setlocal
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
echo Cluster Terminal Agent - one-time setup
 echo This will download the public Cluster repository and install a local PowerShell agent.
echo Review source code at https://github.com/xcxc84584-prog/Cluster before proceeding.
choice /M "Proceed with installation"
if errorlevel 2 exit /b 1
"%PS%" -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $temp=Join-Path $env:TEMP ('cluster-agent-'+[guid]::NewGuid().ToString('N')); New-Item -ItemType Directory -Path $temp | Out-Null; try { $zip=Join-Path $temp 'repo.zip'; Invoke-WebRequest -Uri 'https://github.com/xcxc84584-prog/Cluster/archive/refs/heads/main.zip' -OutFile $zip; Expand-Archive -LiteralPath $zip -DestinationPath $temp; $script=Get-ChildItem -Path $temp -Filter install-once.ps1 -Recurse -File | Where-Object { $_.FullName -match 'agent_terminal' } | Select-Object -First 1; if(-not $script){throw 'Installer missing from downloaded repository. Deploy opt9 to GitHub first.'}; & $script.FullName; if(-not $?){throw 'Installer failed'} } finally {Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue}"
if errorlevel 1 (echo Installation failed. & pause & exit /b 1)
echo Setup complete.
pause
