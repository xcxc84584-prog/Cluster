@echo off
setlocal
title Cluster OAuth Local Test
echo Cluster OAuth Local Setup - v20261108-cachefix-3
echo This checks OAuth locally only. It does not change your running MCP tunnel.
echo.
set "PS1=%TEMP%\Cluster-OAuth-Local-Test-%RANDOM%.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/xcxc84584-prog/Cluster/c1a630f0f35ac70903a17f5907f9117ee924003d/tools/mcp/Cluster-OAuth-Local-Test.ps1' -OutFile '%PS1%'"
if errorlevel 1 (
 echo Download failed. Check your connection.
 pause
 exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
if errorlevel 1 echo OAuth local test failed. Copy the error text without any secrets.
echo.
pause
