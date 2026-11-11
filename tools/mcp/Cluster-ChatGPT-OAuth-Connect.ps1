$ErrorActionPreference='Stop'
Write-Host 'Cluster ChatGPT OAuth Connect - P3.9.3' -ForegroundColor Cyan
Write-Host 'This creates a temporary OAuth HTTPS endpoint for testing. Keep this window open.' -ForegroundColor Yellow
$base=Join-Path $env:LOCALAPPDATA 'ClusterTerminalAgent'
$gateway=Join-Path $base 'app\oauth-mcp-gateway.cjs'
if(!(Test-Path -LiteralPath (Split-Path $gateway))){New-Item -ItemType Directory -Path (Split-Path $gateway) -Force | Out-Null}
$node=(Get-Command node.exe -ErrorAction Stop)
$updater=Join-Path $env:TEMP ('Cluster-MCP-Update-'+[guid]::NewGuid().ToString('N')+'.ps1')
try {
 Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/xcxc84584-prog/Cluster/main/tools/mcp/Update-Cluster-MCP.ps1' -OutFile $updater -ErrorAction Stop
 & $updater -AllowStopClusterServices
 if(-not $?){throw 'MCP component update failed'}
} finally {Remove-Item -LiteralPath $updater -Force -ErrorAction SilentlyContinue}
$cloud=$null
foreach($candidate in @('C:\Program Files (x86)\cloudflared\cloudflared.exe','C:\Program Files\cloudflared\cloudflared.exe',"$env:LOCALAPPDATA\Microsoft\WinGet\Links\cloudflared.exe")){
 if(Test-Path -LiteralPath $candidate -PathType Leaf){$cloud=$candidate;break}
}
if(!$cloud){$cmd=Get-Command cloudflared.exe -ErrorAction SilentlyContinue;if($cmd){$cloud=$cmd.Source}}
if(!$cloud){
 Write-Host 'cloudflared.exe was not found in the known locations or PATH.' -ForegroundColor Yellow
 $winget=Get-Command winget.exe -ErrorAction SilentlyContinue
 if(!$winget){throw 'cloudflared.exe is missing and winget is unavailable. Install Cloudflare cloudflared from the official release and retry.'}
 $answer=Read-Host 'Install Cloudflare cloudflared using winget now? (Y/N)'
 if($answer -notin @('Y','y')){throw 'cloudflared installation declined. OAuth connection was not started.'}
 & $winget.Source install --id Cloudflare.cloudflared --exact --source winget --accept-source-agreements --accept-package-agreements
 if($LASTEXITCODE -ne 0){throw ('cloudflared installation failed (winget exit code '+$LASTEXITCODE+').')}
 foreach($candidate in @(
  'C:\Program Files (x86)\cloudflared\cloudflared.exe',
  'C:\Program Files\cloudflared\cloudflared.exe',
  "$env:LOCALAPPDATA\Microsoft\WinGet\Links\cloudflared.exe",
  "$env:LOCALAPPDATA\Programs\cloudflared\cloudflared.exe"
 )){
  if(Test-Path -LiteralPath $candidate -PathType Leaf){$cloud=$candidate;break}
 }
 if(!$cloud){$cmd=Get-Command cloudflared.exe -ErrorAction SilentlyContinue;if($cmd){$cloud=$cmd.Source}}
 if(!$cloud){
  $packageRoot=Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
  if(Test-Path -LiteralPath $packageRoot){
   $matches=@(Get-ChildItem -LiteralPath $packageRoot -Directory -Filter 'Cloudflare.cloudflared_*' -ErrorAction SilentlyContinue |
    ForEach-Object {Get-ChildItem -LiteralPath $_.FullName -File -Filter cloudflared.exe -Recurse -ErrorAction SilentlyContinue})
   if($matches.Count -gt 0){$cloud=$matches[0].FullName}
  }
 }
 if(!$cloud){throw 'cloudflared was installed but the executable could not be located. Reopen the terminal and retry.'}
}
Write-Host ('cloudflared ready: '+$cloud) -ForegroundColor Green
try{
 $local=Invoke-RestMethod 'http://127.0.0.1:43880/mcp' -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' -TimeoutSec 4
 throw 'Local MCP accepted unauthenticated request; refusing to publish OAuth bridge.'
}catch [System.Net.WebException]{
 if([int]$_.Exception.Response.StatusCode -ne 401){throw 'Local MCP is not ready at 43880. Start Cluster MCP first.'}
}
$token=Join-Path $base 'remote-mcp-token'
if(!(Test-Path -LiteralPath $token)){throw 'Missing local MCP token. Start Cluster MCP first.'}
$oauthPort=43881
# Never terminate a port owner without explicit confirmation and identity checks.
$listeners=@(Get-NetTCPConnection -LocalPort $oauthPort -State Listen -ErrorAction SilentlyContinue)
if($listeners.Count -gt 0){
 $owners=@($listeners | Select-Object -ExpandProperty OwningProcess -Unique)
 if($owners.Count -ne 1){throw 'Multiple processes own port 43881. Resolve the conflict manually.'}
 $ownerId=[int]$owners[0]
 $owner=Get-CimInstance Win32_Process -Filter "ProcessId = $ownerId" -ErrorAction Stop
 if(!$owner){throw 'Could not identify the process on port 43881.'}
 Write-Host ''
 Write-Host 'Port 43881 is already in use:' -ForegroundColor Yellow
 Write-Host ('PID: '+$ownerId)
 Write-Host ('Process: '+$owner.Name)
 Write-Host ('Command: '+$owner.CommandLine)
 $expected=($owner.Name -in @('node.exe','node')) -and ($owner.CommandLine -match 'oauth-mcp-gateway[.]cjs')
 if(!$expected){throw 'Port 43881 is owned by an unrecognized process. Refusing to stop it automatically.'}
 $answer=Read-Host 'Stop this existing Cluster OAuth Gateway and continue? (Y/N)'
 if($answer -cne 'Y' -and $answer -cne 'y'){throw 'Cancelled. Existing Gateway was not changed.'}
 # Revalidate PID identity and ownership immediately before termination.
 $again=Get-CimInstance Win32_Process -Filter "ProcessId = $ownerId" -ErrorAction SilentlyContinue
 $still=@(Get-NetTCPConnection -LocalPort $oauthPort -State Listen -ErrorAction SilentlyContinue | Where-Object OwningProcess -eq $ownerId)
 if(!$again -or $again.CreationDate -ne $owner.CreationDate -or $again.CommandLine -ne $owner.CommandLine -or $still.Count -eq 0){
  throw 'Process changed while waiting for confirmation. Nothing was stopped.'
 }
 Stop-Process -Id $ownerId -Force -ErrorAction Stop
 for($i=0;$i -lt 20;$i++){
  if(-not (Get-NetTCPConnection -LocalPort $oauthPort -State Listen -ErrorAction SilentlyContinue)){break}
  Start-Sleep -Milliseconds 250
 }
 if(Get-NetTCPConnection -LocalPort $oauthPort -State Listen -ErrorAction SilentlyContinue){throw 'Port 43881 is still occupied after stopping the old Gateway.'}
 Write-Host 'Old Cluster OAuth Gateway stopped. Continuing...' -ForegroundColor Green
}
$log=Join-Path $env:TEMP ('Cluster-OAuth-Tunnel-'+[guid]::NewGuid().ToString('N')+'.log')
$err=Join-Path $env:TEMP ('Cluster-OAuth-Tunnel-'+[guid]::NewGuid().ToString('N')+'.err.log')
$gatewayLog=Join-Path $env:TEMP ('Cluster-OAuth-Gateway-'+[guid]::NewGuid().ToString('N')+'.log')
$gatewayErr=Join-Path $env:TEMP ('Cluster-OAuth-Gateway-'+[guid]::NewGuid().ToString('N')+'.err.log')
$tunnel=$null;$service=$null
try{
 Write-Host 'Starting HTTPS tunnel to OAuth Gateway (43881)...'
 $tunnel=Start-Process -FilePath $cloud -ArgumentList @('tunnel','--url','http://127.0.0.1:43881','--no-autoupdate') -RedirectStandardOutput $log -RedirectStandardError $err -PassThru -WindowStyle Hidden
 $issuer=$null
 for($i=0;$i -lt 90;$i++){
  Start-Sleep -Milliseconds 500
  if($tunnel.HasExited){
   $details=@()
   foreach($path in @($err,$log)){
    if(Test-Path -LiteralPath $path){
     $details+=@(Get-Content -LiteralPath $path -Tail 30 -ErrorAction SilentlyContinue)
    }
   }
   $diagnostic=($details | Where-Object {$_ -and $_.Trim()} | Select-Object -Last 20) -join [Environment]::NewLine
   if($diagnostic){Write-Host 'cloudflared diagnostic output:' -ForegroundColor Yellow;Write-Host $diagnostic}
   throw ('cloudflared exited before creating a URL (exit code '+$tunnel.ExitCode+'). Check the diagnostic output and log paths above.')
  }
  foreach($file in @($err,$log)){
   if(Test-Path -LiteralPath $file){
    $raw=Get-Content -LiteralPath $file -Raw -ErrorAction SilentlyContinue
    if($raw -match 'https://[a-zA-Z0-9-]+\.trycloudflare\.com'){$issuer=$Matches[0];break}
   }
  }
  if($issuer){break}
 }
 if(!$issuer){throw 'Timed out waiting for Cloudflare HTTPS URL.'}
 $env:CLUSTER_OAUTH_ISSUER=$issuer
 $env:CLUSTER_OAUTH_PORT='43881'
 $service=Start-Process -FilePath $node.Source -ArgumentList @($gateway) -WorkingDirectory (Split-Path $gateway) -RedirectStandardOutput $gatewayLog -RedirectStandardError $gatewayErr -PassThru -WindowStyle Hidden
 $ready=$false
 for($i=0;$i -lt 40;$i++){
  Start-Sleep -Milliseconds 250
  if($service.HasExited){throw 'OAuth Gateway exited unexpectedly. Check gateway logs.'}
  try{$meta=Invoke-RestMethod 'http://127.0.0.1:43881/.well-known/oauth-authorization-server' -TimeoutSec 2;if($meta.issuer -eq $issuer){$ready=$true;break}}catch{}
 }
 if(!$ready){throw 'OAuth Gateway did not start or issuer mismatch.'}
 Write-Host ''
 Write-Host '========================================' -ForegroundColor Green
 Write-Host 'Cluster ChatGPT OAuth MCP Ready' -ForegroundColor Green
 Write-Host 'MCP URL:' -ForegroundColor Cyan
 Write-Host ($issuer+'/mcp') -ForegroundColor White
 Write-Host 'ChatGPT authentication: OAuth' -ForegroundColor Cyan
 Write-Host '========================================' -ForegroundColor Green
 Write-Host 'When ChatGPT opens the consent page, use the local approval password file:' -ForegroundColor Yellow
 Write-Host (Join-Path $base 'oauth-approval-password')
 Write-Host 'Never share the approval password or MCP bearer token.' -ForegroundColor Yellow
 Write-Host 'Keep this window open; press Ctrl+C to stop both processes.' -ForegroundColor Yellow
 Write-Host ''
 while(!$tunnel.HasExited -and !$service.HasExited){Start-Sleep -Seconds 2}
 throw 'Tunnel or OAuth Gateway stopped unexpectedly.'
}finally{
 if($service -and !$service.HasExited){Stop-Process -Id $service.Id -Force -ErrorAction SilentlyContinue}
 if($tunnel -and !$tunnel.HasExited){Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue}
 Remove-Item Env:CLUSTER_OAUTH_ISSUER,Env:CLUSTER_OAUTH_PORT -ErrorAction SilentlyContinue
 Write-Host 'OAuth session stopped.' -ForegroundColor Yellow
 Write-Host ('Troubleshooting logs: '+$err+' ; '+$gatewayErr)
}
