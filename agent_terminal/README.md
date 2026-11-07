# Cluster Terminal Agent (Windows)

This is a **local executable service**, not a GitHub Pages backend. It launches real Windows PowerShell using `node-pty` (ConPTY).

## Install

1. Install Node.js 20+ on Windows.
2. From `agent_terminal`, run `start-agent.cmd` (or `npm install` and `npm start`). Node-pty may require native build prerequisites if a prebuilt binary is unavailable.
3. Enter the exact GitHub Pages **origin**, e.g. `https://username.github.io` (not the `/repo/` path).
4. Copy the **64-character pairing token** printed in the Agent console into the Cluster terminal setup panel.
5. Open a file from a directory workspace in Cluster Explorer, then enter its absolute Windows root path to bind that workspace.
6. Click `+ Session` to open additional independent PowerShell tabs for the same workspace.

The Agent listens only on `127.0.0.1:43879`, accepts only the configured Origin, requires a fresh pairing token, and limits total sessions to 8. Closing a WebSocket kills its sessions. The Agent does not persist shell sessions or workspace bindings between launches. It does not require Administrator rights.

**Browser compatibility:** HTTPS GitHub Pages -> localhost WebSocket is subject to browser mixed-content/local-network rules. Test with current Chrome/Edge. If a browser blocks `ws://127.0.0.1`, this prototype cannot bypass that policy: a trusted TLS localhost endpoint or browser-compatible transport must be added. Do not disable browser security settings to make it work.

**Security:** A paired website can run arbitrary commands as the signed-in Windows user. Use only a trusted deployment; do not expose the token or the port publicly. Origin matching and a token are necessary but not a replacement for auditing the deployed JavaScript.
