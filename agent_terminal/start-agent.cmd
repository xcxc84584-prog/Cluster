@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1 || (echo Install Node.js 20+ first. & pause & exit /b 1)
if not exist node_modules (call npm install || (pause & exit /b 1))
if "%CLUSTER_TERMINAL_ORIGIN%"=="" (
 set /p CLUSTER_TERMINAL_ORIGIN=Enter your GitHub Pages origin, e.g. https://account.github.io : 
)
node server.cjs
pause
