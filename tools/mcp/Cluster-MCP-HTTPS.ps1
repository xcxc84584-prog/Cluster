$ErrorActionPreference='Stop'
Write-Host 'Cluster MCP HTTPS Tunnel' -ForegroundColor Cyan
Write-Host 'This publishes the MCP endpoint through a temporary public HTTPS URL.' -ForegroundColor Yellow
Write-Host 'The endpoint requires a separate bearer token. Do not share it.'
$base=Join-Path $env:LOCALAPPDATA 'ClusterTerminalAgent'
$app=Join-Path $base 'app'
$launcher=Join-Path $app 'start-remote-mcp.cmd'
$tokenPath=Join-Path $base 'remote-mcp-token'
if(!(Test-Path $launcher)){
 Write-Host 'Cluster Agent installation not found. Download and run the installer first.' -ForegroundColor Red
 Start-Process 'https://github.com/xcxc84584-prog/Cluster/blob/main/Install-Cluster-Terminal.cmd'
 exit 2
}
$body=@{jsonrpc='2.0';id=1;method='tools/list';params=@{}}|ConvertTo-Json -Depth 5
function Test-LocalMcp {
 if(!(Test-Path $tokenPath)){return $null}
 try {
  $token=(Get-Content $tokenPath -Raw).Trim()
  $result=Invoke-RestMethod -Uri 'http://127.0.0.1:43880/mcp' -Method Post -Headers @{Authorization="Bearer $token"} -ContentType 'application/json' -Body $body -TimeoutSec 2
  if($result.result.tools){return $result}
 }catch{}
 return $null
}
Write-Host '[1/3] Checking local MCP...' -ForegroundColor Cyan
$check=Test-LocalMcp
if(!$check){
 $listener=Get-NetTCPConnection -LocalPort 43880 -State Listen -ErrorAction SilentlyContinue
 if($listener){
  throw 'Port 43880 is occupied but did not respond as Cluster MCP. Close the conflicting process and retry.'
 }
 Write-Host '[2/3] Starting local MCP automatically...' -ForegroundColor Cyan
 Start-Process -FilePath 'cmd.exe' -ArgumentList ('/k '+[char]34+$launcher+[char]34) -WorkingDirectory $app
 for($attempt=0;$attempt -lt 20;$attempt++){
  Start-Sleep -Milliseconds 500
  $check=Test-LocalMcp
  if($check){break}
 }
 if(!$check){throw 'Could not start local MCP. Check the newly opened MCP window for the error.'}
}else{
 Write-Host '[2/3] Existing local MCP is running. Reusing it.' -ForegroundColor Green
}
Write-Host ('[3/3] Local MCP ready: '+$check.result.tools.Count+' tools.') -ForegroundColor Green
function Find-Cloudflared {
 $cmd=Get-Command cloudflared.exe -ErrorAction SilentlyContinue
 if($cmd -and $cmd.Source -and (Test-Path -LiteralPath $cmd.Source)){return $cmd.Source}
 $paths=@(
  (Join-Path $env:ProgramFiles 'cloudflared\cloudflared.exe'),
  (Join-Path ${env:ProgramFiles(x86)} 'cloudflared\cloudflared.exe'),
  (Join-Path $env:ProgramFiles 'Cloudflare\cloudflared.exe'),
  (Join-Path $env:ProgramFiles 'Cloudflare\Cloudflared\cloudflared.exe'),
  (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\cloudflared.exe'),
  (Join-Path $env:LOCALAPPDATA 'Programs\cloudflared\cloudflared.exe'),
  (Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\cloudflared.exe')
 )
 foreach($candidate in $paths){if(Test-Path -LiteralPath $candidate){return $candidate}}
 foreach($root in @($env:ProgramFiles, ${env:ProgramFiles(x86)}, $env:LOCALAPPDATA)){
  if(!$root -or !(Test-Path $root)){continue}
  $found=Get-ChildItem -LiteralPath $root -Filter 'cloudflared.exe' -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
  if($found){return $found.FullName}
 }
 return $null
}
$exe=Find-Cloudflared
if(!$exe){
 Write-Host 'cloudflared executable not found. Checking installed package...' -ForegroundColor Yellow
 $installed=(& winget list --id Cloudflare.cloudflared -e --accept-source-agreements 2>$null | Out-String)
 if($installed -match 'Cloudflare\.cloudflared'){
  Write-Host 'cloudflared is installed but its executable is not on PATH.' -ForegroundColor Yellow
 }else{
  $answer=Read-Host 'Install cloudflared using winget now? (Y/N)'
  if($answer -notmatch '^(?i:y|yes)$'){exit 1}
  & winget install --id Cloudflare.cloudflared -e --accept-package-agreements --accept-source-agreements
 }
 $exe=Find-Cloudflared
}
if(!$exe){
 Write-Host 'cloudflared is installed but its executable could not be located automatically.' -ForegroundColor Yellow
 $manual=Read-Host 'Enter full path to cloudflared.exe (or press Enter to exit)'
 if($manual -and (Test-Path -LiteralPath $manual -PathType Leaf)){$exe=$manual}else{throw 'Cannot find cloudflared.exe. Check the installed application path.'}
}
Write-Host ('cloudflared ready: '+$exe) -ForegroundColor Green
Write-Host ''
Write-Host 'IMPORTANT: A temporary tunnel URL is NOT sufficient to register a ChatGPT connector.' -ForegroundColor Yellow
Write-Host 'ChatGPT may require OAuth and a stable HTTPS URL. Never paste bearer tokens into chats.'
$confirm=Read-Host 'Start temporary HTTPS tunnel? (Y/N)'
if($confirm -notin @('Y','y')){exit 0}
Write-Host 'Look for https://...trycloudflare.com in the output. Keep this window open.' -ForegroundColor Cyan
& $exe tunnel --url http://127.0.0.1:43880 --no-autoupdate
