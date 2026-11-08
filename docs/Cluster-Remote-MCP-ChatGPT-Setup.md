# Cluster × ChatGPT — MCP 連接教程 / Quick Setup

> 版本 / Version：P3.8.4。Windows；需要 Node.js、cloudflared、Cluster 本地 Agent 與已完成的 BIND。**OAuth 本機測試不是必要步驟。** 本功能仍在測試階段，ChatGPT 授權及工具呼叫尚待端到端驗收。

## 中文：四步完成連接

1. **啟動 Cluster 本機 MCP。** 在 Cluster 完成 BIND 後，下載並執行 [本機 MCP 啟動器](../tools/mcp/Cluster-MCP-OneClick.cmd)。出現 `Local MCP ready: 5 tools` 即可；若詢問是否啟動額外 HTTPS Tunnel，選 **N**。
2. **啟動 ChatGPT OAuth。** 下載並執行 [OAuth 一鍵連接 CMD](../tools/mcp/Cluster-ChatGPT-OAuth-Connect.cmd)。腳本會自動安裝／更新 OAuth Gateway，啟動 HTTPS Tunnel，並顯示完整 **MCP URL**。請保持視窗開啟。
3. **在 ChatGPT 建立外掛。** 開啟 [外掛程式](https://chatgpt.com/plugins) → **新增 → 新增自訂 MCP 伺服器**。名稱填 `Cluster`，網址貼上第 2 步顯示的 `https://...trycloudflare.com/mcp`，身分驗證選 **OAuth**。
4. **授權。** 在 Cluster 深色授權頁確認唯讀權限，輸入本機密碼並按 **同意授權**。密碼位於 `%LOCALAPPDATA%\ClusterTerminalAgent\oauth-approval-password`，**只在自己的授權頁輸入，不要貼到聊天**。

## English: Four steps

1. **Start local MCP.** Bind the Cluster local Agent, then run [Local MCP CMD](../tools/mcp/Cluster-MCP-OneClick.cmd). Wait for `Local MCP ready: 5 tools`. Choose **N** if prompted to start the optional non-OAuth HTTPS tunnel.
2. **Start ChatGPT OAuth.** Run [OAuth Connect CMD](../tools/mcp/Cluster-ChatGPT-OAuth-Connect.cmd). It installs/updates the OAuth Gateway and prints the full **MCP URL**. Keep the terminal open.
3. **Add a ChatGPT connector.** Open [Plugins](https://chatgpt.com/plugins) → **New → Custom MCP server**. Set name to `Cluster`, paste the URL ending in `/mcp`, and select **OAuth**.
4. **Approve access.** On the dark Cluster consent page, review the read-only permission, enter your local password and select **Approve access**. The password file is `%LOCALAPPDATA%\ClusterTerminalAgent\oauth-approval-password`. **Never paste it into chat.**

## 注意 / Notes

- ChatGPT 必須使用 **OAuth 連接器（43881）** 的網址，不是原本 Bearer MCP（43880）的 Tunnel。
- Quick Tunnel 重新啟動後網址可能改變；需在 ChatGPT 更新連接器。Keep the OAuth CMD window open.
- 若 43881 已被舊 Gateway 占用，先確認顯示的程序資訊，再選 **Y** 允許停止舊程序。
- 目前僅支援五個**唯讀** MCP 工具；無法透過此連線執行 PowerShell 或修改檔案。
- 不要分享 OAuth 密碼、Bearer Token、授權碼或完整 OAuth 回呼 URL。公開部署前仍需完成端到端測試與安全審查。
