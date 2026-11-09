param([switch]$AllowStopClusterServices)
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
  $processes=@()
  foreach($pidValue in @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)){
   $owner=Get-CimInstance Win32_Process -Filter ("ProcessId = "+$pidValue) -ErrorAction Stop
   if(!$owner){throw "Cannot identify listener process $pidValue"}
   $cmd=[string]$owner.CommandLine
   $expected=($owner.Name -in @('node.exe','node')) -and
     ($cmd -match '(?i)(server|remote-mcp|oauth-mcp-gateway)[.]cjs') -and
     ($cmd -match '(?i)ClusterTerminalAgent|(?i)server[.]cjs')
   if(!$expected){throw ("Port owner not recognized as Cluster: PID "+$pidValue+" "+$cmd)}
   $processes+=@{Pid=[int]$pidValue;Created=$owner.CreationDate;Command=$cmd}
   Write-Host ("Cluster service PID "+$pidValue+" "+$cmd) -ForegroundColor Yellow
  }
  if(!$AllowStopClusterServices){throw 'Update requires restarting running services. Run Cluster-MCP-OneClick.cmd to update safely, or stop services manually.'}
  Write-Host 'Updating will disconnect active MCP/OAuth/PowerShell sessions.' -ForegroundColor Yellow
  $answer=Read-Host 'Stop these verified Cluster services and update? (Y/N)'
  if($answer -notmatch '^(?i:y|yes)$'){throw 'Update cancelled. No files changed.'}
  foreach($item in $processes){
   $again=Get-CimInstance Win32_Process -Filter ("ProcessId = "+$item.Pid) -ErrorAction SilentlyContinue
   $still=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object {$_.OwningProcess -eq $item.Pid -and $_.LocalPort -in @(43879,43880,43881)})
   if(!$again -or $again.CreationDate -ne $item.Created -or $again.CommandLine -ne $item.Command -or !$still.Count){throw 'Process changed before termination. No files changed.'}
  }
  foreach($item in $processes){Stop-Process -Id $item.Pid -Force -ErrorAction Stop}
  Start-Sleep -Milliseconds 750
  $busy=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object {$_.LocalPort -in @(43879,43880,43881)})
  if($busy.Count){throw 'Cluster ports still occupied. Update cancelled.'}
 }
 foreach($entry in $changed){Copy-Item -LiteralPath $entry.Temp -Destination $entry.Dest -Force}
 Write-Host 'Cluster MCP components updated. Pairing tokens and OAuth passwords were preserved.' -ForegroundColor Green
}finally{
 foreach($entry in $staged){Remove-Item -LiteralPath $entry.Temp -Force -ErrorAction SilentlyContinue}
}
