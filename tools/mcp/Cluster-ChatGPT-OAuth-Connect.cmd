@echo off
setlocal
title Cluster ChatGPT OAuth Connect
echo Cluster ChatGPT OAuth Connect - P3.8.1-CSP
echo Requires successful OAuth local test and a running Cluster MCP server.
echo.
set "PS1=%TEMP%\Cluster-ChatGPT-OAuth-%RANDOM%.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/xcxc84584-prog/Cluster/a5660c27ff3c534d1b777d4aee4eeceaa1f72c33/tools/mcp/Cluster-ChatGPT-OAuth-Connect.ps1' -OutFile '%PS1%'"
if errorlevel 1 (
 echo Download failed.
 pause
 exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
if errorlevel 1 echo OAuth connect did not complete. Please report non-secret errors.
pause
