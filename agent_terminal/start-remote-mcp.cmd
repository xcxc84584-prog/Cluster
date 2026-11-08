@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1 || (echo Node.js 20+ required. & pause & exit /b 1)
echo Cluster Remote MCP bridge will listen on 127.0.0.1:43880.
echo The service is local only until you configure a trusted HTTPS tunnel.
node remote-mcp.cjs
pause
