$ErrorActionPreference='Stop'
$tokenPath=Join-Path $env:LOCALAPPDATA 'ClusterTerminalAgent\remote-mcp-token'
if(-not (Test-Path -LiteralPath $tokenPath)){throw 'MCP token not found. Run Cluster-MCP-Start.cmd first.'}
$token=(Get-Content -LiteralPath $tokenPath -Raw).Trim()
$headers=@{Authorization="Bearer $token"}
function Invoke-ClusterMcp([string]$method,[object]$params){
 $payload=@{jsonrpc='2.0';id=1;method=$method;params=$params}|ConvertTo-Json -Depth 8
 Invoke-RestMethod -Uri 'http://127.0.0.1:43880/mcp' -Method Post -Headers $headers -ContentType 'application/json' -Body $payload
}
Write-Host '=== MCP tool discovery ==='
$tools=Invoke-ClusterMcp 'tools/list' @{}
$tools.result.tools|Select-Object name,description|Format-Table -AutoSize
Write-Host '=== Cluster status ==='
$status=Invoke-ClusterMcp 'tools/call' @{name='cluster.get_status';arguments=@{}}
$status.result.content|ForEach-Object { $_.text }
Write-Host '=== Cluster open documents ==='
$files=Invoke-ClusterMcp 'tools/call' @{name='cluster.list_files';arguments=@{}}
$files.result.content|ForEach-Object { $_.text }
Write-Host 'Do not share local pairing or remote MCP tokens.'
