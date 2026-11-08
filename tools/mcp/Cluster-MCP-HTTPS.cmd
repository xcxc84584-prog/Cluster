@echo off
setlocal
title Cluster MCP - HTTPS Tunnel
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Cluster-MCP-HTTPS.ps1"
echo.
pause
