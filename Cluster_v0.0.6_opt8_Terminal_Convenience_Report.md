# Cluster v0.0.6 opt8 — Terminal Convenience Report

## Implemented

- Persistent pairing token stored in `%LOCALAPPDATA%\ClusterTerminalAgent\pairing-token` on the user's Windows account; token is not committed to Git.
- Explicit opt-in browser-side remembered pairing via checkbox (localStorage); automatic reconnection when token exists.
- Remember successful workspace mappings in browser localStorage; automatically bind previously selected workspaces after authentication.
- Multiple independent sessions per workspace preserved.
- Opt-in Windows Startup shortcut via `agent_terminal/install-autostart.ps1`, hidden launcher and log in `%LOCALAPPDATA%\ClusterTerminalAgent\agent.log`.
- Uninstall shortcut script provided.

## Important limitations

- Browser localStorage is readable by JavaScript on the same origin; only select Remember pairing on a trusted computer and secure the GitHub Pages origin against XSS. For stronger protection a future version should use native pairing with short-lived credentials.
- Workspace mapping is per browser origin; the browser does not expose absolute Windows paths from File System Access handles.
- First pairing and workspace binding still require user consent. The startup Agent will begin at next Windows sign-in, not immediately upon installation.
- `ws://127.0.0.1` from GitHub Pages is browser-dependent and must be tested in the target browser.
- No actual Windows ConPTY or browser end-to-end test was run in this Linux build environment.
- Explorer context-menu integration and keyboard shortcuts are deferred; existing PowerShell button and + Session work.

## Install

```powershell
cd 'C:\path\to\Cluster\agent_terminal'
PowerShell -ExecutionPolicy Bypass -File .\install-autostart.ps1
.\start-agent.cmd
```

Then open Cluster, enter pairing token, check **Remember pairing**, and bind the workspace once. On next Windows login Agent autostarts; Cluster reconnects automatically. To remove autostart: `powershell -ExecutionPolicy Bypass -File .\uninstall-autostart.ps1`.

## Tests

Static JS syntax checks and existing terminal static tests can be run locally; live Windows tests remain pending.
