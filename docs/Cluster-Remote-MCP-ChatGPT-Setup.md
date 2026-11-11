# Cluster × ChatGPT — MCP 連接教程 / Quick Setup

> 版本 / Version：P3.9.3。Windows；需要 Node.js、cloudflared、Cluster 本地 Agent 與已完成的 BIND。**OAuth 本機測試不是必要步驟。** 本功能仍在測試階段，ChatGPT 授權及工具呼叫尚待端到端驗收。

## 中文：四步完成連接

1. **啟動 Cluster 本機 MCP。** 在 Cluster 完成 BIND 後，下載並執行 [本機 MCP 啟動器](../tools/mcp/Cluster-MCP-OneClick.cmd)。出現 `Local MCP ready: 5 tools` 即可；若詢問是否啟動額外 HTTPS Tunnel，選 **N**。
2. **啟動 ChatGPT OAuth。** 下載並執行 [OAuth 一鍵連接 CMD](../tools/mcp/Cluster-ChatGPT-OAuth-Connect.cmd)。腳本會自動安裝／更新 OAuth Gateway；若找不到 cloudflared，會詢問是否透過 winget 安裝，然後啟動 HTTPS Tunnel，並顯示完整 **MCP URL**。請保持視窗開啟。
3. **在 ChatGPT 建立外掛。** 開啟 [外掛程式](https://chatgpt.com/plugins) → **新增 → 新增自訂 MCP 伺服器**。名稱填 `Cluster`，網址貼上第 2 步顯示的 `https://...trycloudflare.com/mcp`，身分驗證選 **OAuth**。
4. **授權。** 在 Cluster 深色授權頁確認唯讀權限，輸入本機密碼並按 **同意授權**。密碼位於 `%LOCALAPPDATA%\ClusterTerminalAgent\oauth-approval-password`，**只在自己的授權頁輸入，不要貼到聊天**。

## English: Four steps

1. **Start local MCP.** Bind the Cluster local Agent, then run [Local MCP CMD](../tools/mcp/Cluster-MCP-OneClick.cmd). Wait for `Local MCP ready: 5 tools`. Choose **N** if prompted to start the optional non-OAuth HTTPS tunnel.
2. **Start ChatGPT OAuth.** Run [OAuth Connect CMD](../tools/mcp/Cluster-ChatGPT-OAuth-Connect.cmd). It installs/updates the OAuth Gateway, offers to install missing cloudflared through winget with your confirmation, and prints the full **MCP URL**. Keep the terminal open.
3. **Add a ChatGPT connector.** Open [Plugins](https://chatgpt.com/plugins) → **New → Custom MCP server**. Set name to `Cluster`, paste the URL ending in `/mcp`, and select **OAuth**.
4. **Approve access.** On the dark Cluster consent page, review the read-only permission, enter your local password and select **Approve access**. The password file is `%LOCALAPPDATA%\ClusterTerminalAgent\oauth-approval-password`. **Never paste it into chat.**

## 注意 / Notes

- ChatGPT 必須使用 **OAuth 連接器（43881）** 的網址，不是原本 Bearer MCP（43880）的 Tunnel。
- Quick Tunnel 重新啟動後網址可能改變；需在 ChatGPT 更新連接器。Keep the OAuth CMD window open.
- 若 43881 已被舊 Gateway 占用，先確認顯示的程序資訊，再選 **Y** 允許停止舊程序。
- 目前僅支援五個**唯讀** MCP 工具；無法透過此連線執行 PowerShell 或修改檔案。
- 不要分享 OAuth 密碼、Bearer Token、授權碼或完整 OAuth 回呼 URL。公開部署前仍需完成端到端測試與安全審查。

## cloudflared 安裝位置與故障排除 / Installation paths and troubleshooting

- **不必手動指定固定安裝路徑。** OAuth Connect 會先查詢 `PATH` 與已知位置；找不到時，在使用者確認後執行 `winget install --id Cloudflare.cloudflared --exact --source winget`。Windows 安裝路徑會因安裝範圍與套件版本而異，請勿假設所有電腦均使用同一位置。
- **目前腳本檢查的位置 / Paths checked:** `C:\\Program Files (x86)\\cloudflared\\cloudflared.exe`、`C:\\Program Files\\cloudflared\\cloudflared.exe`、`%LOCALAPPDATA%\\Microsoft\\WinGet\\Links\\cloudflared.exe`；安裝後也檢查 `%LOCALAPPDATA%\\Programs\\cloudflared\\cloudflared.exe` 及 WinGet Packages 中的安裝檔。
- **檢查安裝 / Verify:** 在新開的 PowerShell 執行 `Get-Command cloudflared.exe -ErrorAction SilentlyContinue` 或 `winget list --id Cloudflare.cloudflared`。若找不到，請重新執行 OAuth Connect 並依提示選擇安裝。
- **安裝失敗 / Installation failure:** 確認 `winget --version` 可用；若無 winget，請從 Cloudflare 官方文件安裝 cloudflared，重新開啟終端再試。安裝與執行仍受 Windows 使用者權限和安全政策限制。
- **安全 / Security:** 不要將 OAuth Gateway 的本地 Bearer MCP 端口 `43880` 直接公開；僅使用 OAuth Gateway `43881` 對應的 HTTPS `/mcp` URL。

