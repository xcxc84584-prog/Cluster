# Opt-in installation for current Windows user only. No administrator privileges required.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
if (!(Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 20+ is required.' }
if (!(Test-Path (Join-Path $here 'node_modules'))) { Push-Location $here; try { npm install; if ($LASTEXITCODE -ne 0) { throw 'npm install failed' } } finally { Pop-Location } }
$origin = Read-Host 'Trusted GitHub Pages origin (e.g. https://xcxc84584-prog.github.io)'
$uri = $null
if (![Uri]::TryCreate($origin,[UriKind]::Absolute,[ref]$uri) -or $uri.Scheme -ne 'https' -or $uri.AbsolutePath -ne '/') { throw 'Enter a HTTPS origin without a path.' }
$cfg = Join-Path $env:LOCALAPPDATA 'ClusterTerminalAgent'
New-Item -ItemType Directory -Force -Path $cfg | Out-Null
$origin | Set-Content -Encoding ascii (Join-Path $cfg 'origin.txt')
$launcher = Join-Path $here 'run-hidden.vbs'
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'Cluster Terminal Agent.lnk'
$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "$env:SystemRoot\System32\wscript.exe"
$shortcut.Arguments = '"' + $launcher + '"'
$shortcut.WorkingDirectory = $here
$shortcut.Save()
Write-Host "Installed startup shortcut: $shortcutPath"
Write-Host 'Run start-agent.cmd once to view your persistent pairing token, then enable Remember pairing in Cluster.'
Write-Host 'The Agent will start automatically after your next Windows sign-in.'
