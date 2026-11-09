# Cluster v1 BASE MCP component updater. Preserves pairing and OAuth secrets.
$ErrorActionPreference='Stop'
$base=Join-Path $env:LOCALAPPDATA 'ClusterTerminalAgent'
$app=Join-Path $base 'app'
if(!(Test-Path $app)){throw 'Cluster Agent is not installed. Run Install-Cluster-Terminal.cmd first.'}
$node=Get-Command node.exe -ErrorAction Stop
$files=@('server.cjs','remote-mcp.cjs','oauth-mcp-gateway.cjs')
$staged=@()
try {
 foreach($name in $files){
  $dest=Join-Path $app $name
  $temp=Join-Path $env:TEMP ('cluster-mcp-'+[guid]::NewGuid().ToString('N')+'-'+$name)
  Invoke-WebRequest -UseBasicParsing -Uri ('https://raw.githubusercontent.com/xcxc84584-prog/Cluster/main/agent_terminal/'+$name) -OutFile $temp -ErrorAction Stop
  & $node.Source --check $temp
  if($LASTEXITCODE -ne 0){throw ('Syntax check failed: '+$name)}
  $staged+=@{Name=$name;Dest=$dest;Temp=$temp}
 }
 $changed=@($staged | Where-Object {!(Test-Path $_.Dest) -or (Get-FileHash $_.Dest).Hash -ne (Get-FileHash $_.Temp).Hash})
 if(!$changed.Count){Write-Host 'Cluster MCP components are already current.' -ForegroundColor Green;exit 0}
 Write-Host ('MCP updates available: '+(($changed|ForEach-Object Name)-join ', ')) -ForegroundColor Cyan
 $listeners=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in @(43879,43880,43881) })
 if($listeners.Count){
  Write-Host 'Existing Cluster services may have active sessions.' -ForegroundColor Yellow
  foreach($entry in $listeners){
   $owner=Get-CimInstance Win32_Process -Filter ('ProcessId='+$entry.OwningProcess) -ErrorAction SilentlyContinue
   Write-Host ('Port '+$entry.LocalPort+' PID '+$entry.OwningProcess+' '+$owner.Name+' '+$owner.CommandLine)
  }
  Write-Host 'Stop Cluster MCP/OAuth services yourself before updating; existing credentials will be preserved.' -ForegroundColor Yellow
  throw 'Update deferred: services are running. Stop them and retry. No files changed.'
 }
 foreach($entry in $changed){Copy-Item -LiteralPath $entry.Temp -Destination $entry.Dest -Force}
 Write-Host 'Cluster MCP components updated. Pairing tokens and OAuth passwords were preserved.' -ForegroundColor Green
}finally{
 foreach($entry in $staged){Remove-Item -LiteralPath $entry.Temp -Force -ErrorAction SilentlyContinue}
}
