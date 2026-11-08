@echo off
setlocal
title Cluster ChatGPT OAuth Connect
echo Cluster ChatGPT OAuth Connect - P3.8.4-UI-BILINGUAL
echo Requires a running Cluster MCP server. OAuth Gateway installs automatically.
echo.
set "PS1=%TEMP%\Cluster-ChatGPT-OAuth-%RANDOM%.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/xcxc84584-prog/Cluster/3e509b067aa6eedf91b18ec640f275997051c5b7/tools/mcp/Cluster-ChatGPT-OAuth-Connect.ps1' -OutFile '%PS1%'"
if errorlevel 1 (
 echo Download failed.
 pause
 exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
if errorlevel 1 echo OAuth connect did not complete. Please report non-secret errors.
pause
