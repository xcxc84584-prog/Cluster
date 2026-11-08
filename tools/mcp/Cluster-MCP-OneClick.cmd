@echo off
setlocal
title Cluster MCP - One Click
echo Cluster MCP Setup - v20261108-url-output-4
set "SCRIPT=%TEMP%\Cluster-MCP-HTTPS-%RANDOM%.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/xcxc84584-prog/Cluster/87b3a5dc5a0969a32f8ae098ca175adb18a76b93/tools/mcp/Cluster-MCP-HTTPS.ps1' -OutFile '%SCRIPT%' -ErrorAction Stop } catch { Write-Host $_.Exception.Message; exit 1 }"
if errorlevel 1 (echo Download failed. & pause & exit /b 1)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
set "RESULT=%ERRORLEVEL%"
del /q "%SCRIPT%" >nul 2>&1
if not "%RESULT%"=="0" echo Setup did not complete. Check the message above.
pause
exit /b %RESULT%
