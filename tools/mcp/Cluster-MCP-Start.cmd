@echo off
setlocal
set "APP=%LOCALAPPDATA%\ClusterTerminalAgent\app"
if not exist "%APP%\start-remote-mcp.cmd" (
 echo Cluster MCP is not installed. Install the latest Cluster Terminal Agent first.
 pause
 exit /b 1
)
call "%APP%\start-remote-mcp.cmd"
