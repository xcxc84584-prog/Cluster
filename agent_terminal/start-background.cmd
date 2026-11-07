@echo off
setlocal
cd /d "%~dp0"
if not exist "%LOCALAPPDATA%\ClusterTerminalAgent\origin.txt" exit /b 1
set /p CLUSTER_TERMINAL_ORIGIN=<"%LOCALAPPDATA%\ClusterTerminalAgent\origin.txt"
where node >nul 2>&1 || exit /b 1
node server.cjs >>"%LOCALAPPDATA%\ClusterTerminalAgent\agent.log" 2>&1
