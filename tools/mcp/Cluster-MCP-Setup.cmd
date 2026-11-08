@echo off
setlocal
echo Cluster MCP Quick Setup
echo 1. Install or update local Agent
echo 2. Start local MCP HTTP bridge
echo 3. Test MCP tool discovery and Cluster status
echo.
echo Download the latest Cluster Terminal installer first if it is not installed.
set /p answer=Open Cluster Terminal installer download page? [Y/N]:
if /i "%answer%"=="Y" start "" "https://github.com/xcxc84584-prog/Cluster/raw/refs/heads/main/Install-Cluster-Terminal.cmd"
if not exist "%LOCALAPPDATA%\ClusterTerminalAgent\app\start-remote-mcp.cmd" (
 echo Install Cluster Terminal Agent first, then run this setup again.
 pause
 exit /b 1
)
start "Cluster MCP Bridge" cmd /k ""%LOCALAPPDATA%\ClusterTerminalAgent\app\start-remote-mcp.cmd""
timeout /t 3 /nobreak >nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Cluster-MCP-Test.ps1"
echo.
echo Local MCP URL: http://127.0.0.1:43880/mcp
echo Remote ChatGPT requires an HTTPS endpoint and compatible authentication.
pause
