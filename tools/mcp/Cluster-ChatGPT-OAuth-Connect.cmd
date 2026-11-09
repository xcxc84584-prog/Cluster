@echo off
setlocal
title Cluster ChatGPT OAuth Connect - v20261109-safe-update-1
echo Cluster ChatGPT OAuth Connect - P3.9.3-DARK-OAUTH
echo Requires a running Cluster MCP server. OAuth Gateway installs automatically.
echo.
set "PS1=%TEMP%\Cluster-ChatGPT-OAuth-%RANDOM%.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/xcxc84584-prog/Cluster/main/tools/mcp/Cluster-ChatGPT-OAuth-Connect.ps1' -OutFile '%PS1%'"
if errorlevel 1 (
 echo Download failed.
 pause
 exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
if errorlevel 1 echo OAuth connect did not complete. Please report non-secret errors.
pause
