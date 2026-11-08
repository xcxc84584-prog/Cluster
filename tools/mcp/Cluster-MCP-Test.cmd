@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Cluster-MCP-Test.ps1"
if errorlevel 1 echo MCP test failed. Ensure both the local Agent and remote MCP bridge are running.
pause
