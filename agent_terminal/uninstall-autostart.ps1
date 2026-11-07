$link=Join-Path ([Environment]::GetFolderPath('Startup')) 'Cluster Terminal Agent.lnk'
if(Test-Path $link){Remove-Item -LiteralPath $link -Force;Write-Host 'Autostart shortcut removed.'}
Write-Host 'Existing Agent process and pairing credentials are not deleted.'
