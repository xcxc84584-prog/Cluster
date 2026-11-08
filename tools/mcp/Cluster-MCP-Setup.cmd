@echo off
setlocal
title Cluster MCP - One Click Setup
echo =====================================
echo   Cluster MCP - One Click Setup
echo =====================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
 "$ErrorActionPreference='Stop';" ^
 "$base=Join-Path $env:LOCALAPPDATA 'ClusterTerminalAgent';" ^
 "$app=Join-Path $base 'app';" ^
 "$launcher=Join-Path $app 'start-remote-mcp.cmd';" ^
 "$tokenFile=Join-Path $base 'remote-mcp-token';" ^
 "if(!(Test-Path $launcher)){Write-Host '[1/3] Local Agent not installed or outdated.' -ForegroundColor Yellow;Write-Host 'Download the latest installer from the opened page, run it, then reopen this setup.';Start-Process 'https://github.com/xcxc84584-prog/Cluster/blob/main/Install-Cluster-Terminal.cmd';exit 2};" ^
 "Write-Host '[1/3] Agent installation found.' -ForegroundColor Green;" ^
 "$port=43880;$listener=Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue;" ^
 "if($listener){Write-Host '[2/3] Port 43880 already in use. Checking MCP service...'}else{Write-Host '[2/3] Starting MCP service...';Start-Process -FilePath 'cmd.exe' -ArgumentList ('/k '+[char]34+$launcher+[char]34) -WorkingDirectory $app;Start-Sleep -Seconds 3};" ^
 "if(!(Test-Path $tokenFile)){Write-Host 'ERROR: MCP token missing. Check the service window.' -ForegroundColor Red;exit 3};" ^
 "$token=(Get-Content $tokenFile -Raw).Trim();$headers=@{Authorization='Bearer '+$token};" ^
 "function CallMcp($method,$params){$body=@{jsonrpc='2.0';id=1;method=$method;params=$params}|ConvertTo-Json -Depth 6;Invoke-RestMethod -Uri 'http://127.0.0.1:43880/mcp' -Method Post -Headers $headers -ContentType 'application/json' -Body $body -TimeoutSec 12};" ^
 "try{$list=CallMcp 'tools/list' @{};if(!$list.result.tools){throw 'No MCP tools returned'};Write-Host ('[3/3] MCP ready: '+$list.result.tools.Count+' tools.') -ForegroundColor Green;$status=CallMcp 'tools/call' @{name='cluster.get_status';arguments=@{}};Write-Host 'Gateway status:';($status.result.content|ForEach-Object {$_.text});Write-Host 'SUCCESS: Local MCP connection verified.' -ForegroundColor Green;Write-Host 'Keep Cluster AI Agent connected. ChatGPT web still needs HTTPS connector setup.'}catch{Write-Host ('FAILED: '+$_.Exception.Message) -ForegroundColor Red;Write-Host 'If port 43880 belongs to another program, close it manually and retry.';exit 4}"
echo.
pause
