@echo off
setlocal
title Cluster OAuth Local Test
echo Cluster OAuth Local Setup and Safety Check
echo This checks OAuth locally only. It does not change your running MCP tunnel.
echo.
set "PS1=%TEMP%\Cluster-OAuth-Local-Test.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/xcxc84584-prog/Cluster/main/tools/mcp/Cluster-OAuth-Local-Test.ps1' -OutFile '%PS1%'"
if errorlevel 1 (
 echo Download failed. Check your connection.
 pause
 exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
if errorlevel 1 echo OAuth local test failed. Copy the error text without any secrets.
echo.
pause
