$ErrorActionPreference = 'Stop'
Write-Host 'Cluster OAuth Local Setup + Safety Check (P3.7.3)' -ForegroundColor Cyan
Write-Host 'This is a LOCAL test only. It does not publish an OAuth endpoint or change the existing MCP tunnel.' -ForegroundColor Yellow
$base = Join-Path $env:LOCALAPPDATA 'ClusterTerminalAgent'
$app = Join-Path $base 'app'
$target = Join-Path $app 'oauth-mcp-gateway.cjs'
New-Item -ItemType Directory -Force -Path $app | Out-Null
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (!$node) { throw 'Node.js 20+ is required. Install Node.js and reopen PowerShell.' }
$version = (& $node.Source --version).Trim()
if ([int]($version -replace '^v(\d+).*','$1') -lt 20) { throw ('Node.js 20+ required; detected '+$version) }
Write-Host ('Node.js: '+$version) -ForegroundColor Green
$source = 'https://raw.githubusercontent.com/xcxc84584-prog/Cluster/main/agent_terminal/oauth-mcp-gateway.cjs'
Write-Host 'Downloading OAuth gateway source from Cluster GitHub...' -ForegroundColor Cyan
Invoke-WebRequest -Uri $source -OutFile ($target+'.download.cjs') -UseBasicParsing
& $node.Source --check ($target+'.download.cjs')
if ($LASTEXITCODE -ne 0) { Remove-Item ($target+'.download.cjs') -Force; throw 'Gateway syntax check failed.' }
Move-Item -Path ($target+'.download.cjs') -Destination $target -Force
Write-Host ('Installed: '+$target) -ForegroundColor Green
$port = 43881
if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { throw 'Port 43881 is occupied. Close the existing OAuth gateway before local test.' }
$env:CLUSTER_OAUTH_ISSUER='https://cluster-local-test.invalid'
$env:CLUSTER_OAUTH_PORT="$port"
$process=Start-Process -FilePath $node.Source -ArgumentList @($target) -WorkingDirectory $app -PassThru -WindowStyle Hidden
try {
 $origin="http://127.0.0.1:$port"
 $ready=$false
 for($i=0;$i -lt 30;$i++){
  Start-Sleep -Milliseconds 200
  try { $meta=Invoke-RestMethod "$origin/.well-known/oauth-authorization-server" -TimeoutSec 2; $ready=$true; break } catch {}
 }
 if(!$ready){throw 'OAuth gateway failed to start.'}
 if($meta.issuer -ne $env:CLUSTER_OAUTH_ISSUER -or $meta.code_challenge_methods_supported -notcontains 'S256'){throw 'OAuth metadata validation failed.'}
 Write-Host '[PASS] OAuth discovery + PKCE S256 metadata' -ForegroundColor Green
 $resource=Invoke-RestMethod "$origin/.well-known/oauth-protected-resource/mcp"
 if($resource.resource -ne ($env:CLUSTER_OAUTH_ISSUER+'/mcp')){throw 'Protected resource metadata mismatch.'}
 Write-Host '[PASS] Protected resource metadata' -ForegroundColor Green
 $unauthorized=$null
 try { Invoke-WebRequest "$origin/mcp" -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' -UseBasicParsing | Out-Null; throw 'Unauthenticated request unexpectedly accepted' }
 catch [System.Net.WebException] { $unauthorized=[int]$_.Exception.Response.StatusCode }
 if($unauthorized -ne 401){throw "Expected HTTP 401; received $unauthorized"}
 Write-Host '[PASS] Unauthenticated MCP denied (401)' -ForegroundColor Green
 $badRegistration=$null
 try { Invoke-WebRequest "$origin/register" -Method Post -ContentType 'application/json' -Body '{"redirect_uris":["http://example.com/callback"]}' -UseBasicParsing | Out-Null;throw 'Unsafe redirect unexpectedly accepted' }
 catch [System.Net.WebException] { $badRegistration=[int]$_.Exception.Response.StatusCode }
 if($badRegistration -ne 400){throw "Expected HTTP 400; received $badRegistration"}
 Write-Host '[PASS] Unsafe HTTP redirect URI denied (400)' -ForegroundColor Green
 $client=Invoke-RestMethod "$origin/register" -Method Post -ContentType 'application/json' -Body '{"redirect_uris":["http://127.0.0.1:43123/callback"],"token_endpoint_auth_method":"none"}'
 if(!$client.client_id){throw 'Dynamic registration failed'}
 Write-Host '[PASS] OAuth public client registration' -ForegroundColor Green
 Write-Host ''
 Write-Host 'LOCAL CHECKS PASSED. The test server will now stop.' -ForegroundColor Green
 Write-Host 'ChatGPT OAuth integration and public security review are NOT verified.' -ForegroundColor Yellow
 Write-Host 'Next: configure a stable HTTPS domain and Named Tunnel before external OAuth testing.' -ForegroundColor Yellow
} finally {
 if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}
 Remove-Item Env:CLUSTER_OAUTH_ISSUER -ErrorAction SilentlyContinue
 Remove-Item Env:CLUSTER_OAUTH_PORT -ErrorAction SilentlyContinue
}
