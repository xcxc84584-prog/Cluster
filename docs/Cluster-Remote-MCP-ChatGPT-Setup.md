# Cluster Remote MCP → ChatGPT 設定與驗證教程（實測紀錄）

> 日期：2026-11-08。狀態：HTTPS MCP 工具發現已通過；ChatGPT OAuth 尚未實作／驗證。請勿將本教程中的預期行為誤當成已通過測試。

## 1. 啟動本地環境

1. 安裝並啟動 Cluster Local Agent，確認 Cluster Browser 已完成 BIND。
2. 執行 `Cluster-MCP-OneClick.cmd`。已安裝的 Remote MCP 可直接重用。
3. 確認終端顯示 `Local MCP ready: 5 tools.`。
4. 確認 cloudflared 路徑。實測 Windows 安裝位置：`C:\Program Files (x86)\cloudflared\cloudflared.exe`。
5. 在 `Start temporary HTTPS tunnel? (Y/N)` 輸入 `Y`。
6. 等待 `Your quick Tunnel has been created!`、`Registered tunnel connection`，並記錄臨時 `https://<random>.trycloudflare.com` URL。保持視窗開啟。

## 2. 驗證 HTTPS 與 MCP

1. 在 PowerShell 對 `https://<random>.trycloudflare.com/mcp` 發出未授權 GET，實測回應 HTTP 401。
2. 從 `$env:LOCALAPPDATA\ClusterTerminalAgent\remote-mcp-token` 在本機讀取 Token。**絕不貼出 Token 或 Authorization header。**
3. 對同一 HTTPS MCP URL 發出帶 `Authorization: Bearer <token>` 的 JSON-RPC POST：`{"jsonrpc":"2.0","id":1,"method":"tools/list"}`。
4. 實測成功取得五個工具：`cluster.get_status`、`cluster.get_task_status`、`cluster.list_files`、`cluster.get_editor_state`、`cluster.read_file`。

## 3. ChatGPT 自訂 MCP 入口（使用者實測）

1. 開啟 ChatGPT 左側「外掛程式」頁面：`https://chatgpt.com/plugins`。
2. 右上角「新增」→「新增自訂 MCP 伺服器」。
3. 名稱：`Cluster`。
4. 說明：`Cluster Local IDE Remote MCP`。
5. 連線：`https://<random>.trycloudflare.com/mcp`。
6. 身分驗證下拉選單實測顯示：「OAuth」、「無需身分驗證」、「OAuth 或無需身分驗證」。
7. **不要選無驗證並直接公開現有本地 MCP；不要輸入或公開 Bearer Token。**
8. 目前停止在 OAuth 相容層開發階段；尚未點擊「建立外掛程式」完成授權。

## 4. 開發待辦與驗收條件

- [ ] 以穩定 HTTPS 域名部署 OAuth Gateway；臨時 trycloudflare URL 僅供測試。
- [ ] 依 MCP OAuth 規範實作受保護資源中繼資料、授權伺服器中繼資料、授權碼 + PKCE、Token 發放與撤銷、redirect URI 精確比對。
- [ ] 實作明確的使用者登入／授權同意，避免公開匿名取得 Token。
- [ ] Gateway 驗證 ChatGPT Access Token 後，使用獨立內部 Bearer Token 轉發至 loopback MCP。
- [ ] 保留讀取權限限制；寫入及 PowerShell 操作必須另行授權與審核。
- [ ] 測試拒絕未授權請求、PKCE 錯誤、過期 Token、錯誤 redirect URI、OAuth 正常流程。
- [ ] 在 ChatGPT 中完成連接器註冊，實際呼叫五個 MCP 工具並記錄結果。

## 5. 已知限制

- `tools/list` 通過只代表遠端 MCP 協定可用，不代表 ChatGPT 已完成註冊。
- 現有 MCP Server 使用靜態 Bearer Token，不能直接替代 OAuth。
- Cloudflare Quick Tunnel 沒有穩定性保證，重新啟動後 URL 可能改變。
- `cluster.list_files` 僅列出編輯器已開啟的檔案；`cluster.read_file` 目前僅支援符合限制的已儲存檔案。


## 6. P3.7 OAuth Gateway 原型（已提交，未部署驗證）

新增 agent_terminal/oauth-mcp-gateway.cjs：Node.js 20+，監聽 127.0.0.1:43881，提供 OAuth 授權碼 + PKCE S256、動態註冊、授權與受保護資源中繼資料、授權同意頁、短期 Access Token，並以內部 Bearer Token 轉發到 43880。

### 待使用者執行的部署步驟

1. 準備自己的穩定 HTTPS 網域與 Cloudflare Named Tunnel；臨時 trycloudflare URL 不適合當持久 OAuth issuer。
2. 將 oauth-mcp-gateway.cjs 安裝到本機 ClusterTerminalAgent/app，保留既有 43879 與 43880 服務。
3. 在 PowerShell 設定環境變數 CLUSTER_OAUTH_ISSUER 為完整 HTTPS origin（不含 /mcp），執行 node oauth-mcp-gateway.cjs。
4. Named Tunnel 僅轉發到 127.0.0.1:43881，不可公開 43879 或取消 43880 的驗證。
5. 本機授權密碼存於 %LOCALAPPDATA%/ClusterTerminalAgent/oauth-approval-password；只在授權頁輸入，絕不貼到聊天。
6. 驗證 OAuth metadata、register、authorize、token、/mcp，然後在 ChatGPT 自訂 MCP 連接器選 OAuth，填入固定域名的 /mcp URL。

### 尚未完成

- 本原型尚未在使用者 Windows 電腦實測，也未完成 ChatGPT 端到端授權。
- 尚未製作一鍵安裝與 Named Tunnel 設定。
- 用戶端與 Token 存在記憶體，服務重啟後需要重新註冊／授權。
- 正式公開前仍需加強全域速率限制、稽核與安全測試。
- 現有工具僅提供唯讀操作，尚未提供寫入或 PowerShell 權限。
