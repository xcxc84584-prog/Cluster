$ErrorActionPreference='Stop'
Write-Host 'Cluster MCP HTTPS Tunnel' -ForegroundColor Cyan
Write-Host 'This publishes the MCP endpoint through a temporary public HTTPS URL.' -ForegroundColor Yellow
Write-Host 'The endpoint requires a separate bearer token. Do not share it.'
$base=Join-Path $env:LOCALAPPDATA 'ClusterTerminalAgent'
$tokenPath=Join-Path $base 'remote-mcp-token'
if(!(Test-Path $tokenPath)){throw 'Run Cluster-MCP-Setup.cmd first.'}
$token=(Get-Content $tokenPath -Raw).Trim()
$body=@{jsonrpc='2.0';id=1;method='tools/list';params=@{}}|ConvertTo-Json -Depth 5
try{$check=Invoke-RestMethod -Uri 'http://127.0.0.1:43880/mcp' -Method Post -Headers @{Authorization="Bearer $token"} -ContentType 'application/json' -Body $body -TimeoutSec 5}catch{throw 'Local MCP is not running. Run Cluster-MCP-Setup.cmd first.'}
if(!$check.result.tools){throw 'Local MCP tools/list failed'}
Write-Host ('Local MCP ready: '+$check.result.tools.Count+' tools.') -ForegroundColor Green
$cmd=Get-Command cloudflared -ErrorAction SilentlyContinue
if(!$cmd){
 Write-Host 'cloudflared not found. Install it from the official Cloudflare package.' -ForegroundColor Yellow
 Write-Host 'Run: winget install --id Cloudflare.cloudflared -e'
 $answer=Read-Host 'Install cloudflared using winget now? (Y/N)'
 if($answer -notin @('Y','y')){exit 1}
 & winget install --id Cloudflare.cloudflared -e
 if($LASTEXITCODE -ne 0){throw 'cloudflared installation failed'}
 $cmd=Get-Command cloudflared -ErrorAction SilentlyContinue
 if(!$cmd){
  $locations=@("$env:ProgramFiles\cloudflared\cloudflared.exe","$env:LOCALAPPDATA\Microsoft\WinGet\Links\cloudflared.exe")
  $found=$locations|Where-Object {Test-Path $_}|Select-Object -First 1
  if(!$found){throw 'Restart PowerShell and rerun after installation.'}
  $exe=$found
 }else{$exe=$cmd.Source}
}else{$exe=$cmd.Source}
Write-Host ''
Write-Host 'IMPORTANT: A temporary tunnel URL is NOT sufficient to register a ChatGPT connector.' -ForegroundColor Yellow
Write-Host 'ChatGPT may require OAuth and a stable HTTPS URL. Never paste bearer tokens into chats.'
$confirm=Read-Host 'Start temporary HTTPS tunnel? (Y/N)'
if($confirm -notin @('Y','y')){exit 0}
Write-Host 'Look for https://...trycloudflare.com in the output. Keep this window open.' -ForegroundColor Cyan
& $exe tunnel --url http://127.0.0.1:43880 --no-autoupdate
