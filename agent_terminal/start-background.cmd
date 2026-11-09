@echo off
setlocal
cd /d "%~dp0"
if not exist "%LOCALAPPDATA%\ClusterTerminalAgent\origin.txt" exit /b 1
set /p CLUSTER_TERMINAL_ORIGIN=<"%LOCALAPPDATA%\ClusterTerminalAgent\origin.txt"
set "NODE_EXE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
if not defined NODE_EXE (
  for %%N in ("%ProgramFiles%\nodejs\node.exe" "%LOCALAPPDATA%\Programs\nodejs\node.exe" "D:\DownLoad File\Node_js\node.exe") do if exist "%%~N" set "NODE_EXE=%%~N"
)
if not defined NODE_EXE (
 echo Node.js executable not found. >>"%LOCALAPPDATA%\ClusterTerminalAgent\agent.log"
 exit /b 1
)
"%NODE_EXE%" server.cjs >>"%LOCALAPPDATA%\ClusterTerminalAgent\agent.log" 2>&1
