# Cluster v0.0.6 opt6 — GitHub Pages + Real PowerShell Terminal

## 0. 需求
保留 Cluster 現有 UI 與文件編輯功能，移除舊 `local-powershell` 模擬器；在文件分頁開啟真正的 Windows PowerShell；同一 Workspace 允許多個獨立終端；首次使用引導安裝本地 Agent；工作目錄為目前文件所屬 Workspace 根目錄。

## 1. 部署
1. 解壓完整 ZIP，將網頁目錄部署到 GitHub Pages；`index.html` 會轉至 `BASE/`。
2. 使用者在 Windows 安裝 Node.js 20+。
3. 使用者下載相同版本 ZIP，進入 `agent_terminal`，執行 `start-agent.cmd`。第一次會執行 `npm install`，安裝 `ws` 與 `node-pty`。若 node-pty 無預編譯二進位，需安裝 Windows C++ 編譯工具。
4. Agent 詢問 GitHub Pages origin（例如 `https://username.github.io`），並顯示隨機配對 Token。
5. Cluster 中先用 Explorer 開啟資料夾 Workspace，選擇其中一個文件，點 PowerShell，貼入 Token 並連線。
6. 首次綁定 Workspace 時，輸入 Windows 絕對路徑；Agent 驗證目錄存在且名稱符合 Workspace Root。
7. 點 `+ Session` 可在同一 Workspace 建立多個獨立 PowerShell 分頁。

## 2. 修改內容
- `BASE/cluster-standalone.js`：PowerShell 按鈕改呼叫內嵌 Terminal Plugin；文件分頁切換時停用終端視圖；更新文件分頁時同步終端分頁。
- `BASE/index.html`：載入 Terminal Plugin CSS / JS。
- 移除 `local-powershell/`（模擬命令）。

## 3. 新增內容
- `plugin_terminal/terminal.js`：終端分頁、Agent 配對、Workspace 綁定、Session 建立／關閉、xterm.js。
- `plugin_terminal/terminal.css`：終端分頁與安裝引導樣式。
- `agent_terminal/server.cjs`：Node.js Local Agent，Windows ConPTY、WebSocket、來源驗證、Token 配對、Workspace 綁定。
- `agent_terminal/package.json`、`start-agent.cmd`、`README.md`。
- `tests/terminal-static.test.cjs`：靜態整合檢查。

## 4. 技術限制
- GitHub Pages 不能直接啟動 PowerShell；必須在 Windows 本機啟動 Agent。
- 本版本提供 **Node.js 原始碼 + CMD 安裝啟動引導**，尚未封裝成經簽章的 Windows EXE 安裝程式。
- `node-pty` 需要 Windows 原生模組；本執行環境未驗證其 Windows 安裝與 ConPTY 啟動。
- HTTPS GitHub Pages 連線到 `ws://127.0.0.1` 可能受瀏覽器混合內容或本地網路政策限制。若被封鎖，需後續改為受信任的 TLS loopback 通道或受支援的本機傳輸機制，不應要求使用者關閉瀏覽器安全保護。
- 工作區絕對路徑不能由瀏覽器 FileSystemHandle 直接讀取；首次由使用者輸入，Agent 驗證並在本次程序生命週期內綁定。
- 目前 Agent 斷線時會終止其所屬 Session，不支援重新附掛。
- xterm.js 從 jsDelivr CDN 載入，需連線可用；正式發布宜鎖定依賴並自行託管。
- PowerShell 目前使用 Windows PowerShell 5.1 `powershell.exe`，尚未新增 PowerShell 7 Shell Profile 切換。
- 本版本尚未提供正式可驗證的安裝程式簽章及自動更新機制。

## 5. 測試結果
- `node --check BASE/cluster-standalone.js`：PASS。
- `node --check plugin_terminal/terminal.js`：PASS。
- `node --check agent_terminal/server.cjs`：PASS。
- `node --test tests/terminal-static.test.cjs`：PASS（6 個靜態整合測試）。
- Windows Agent 真正執行、GitHub Pages 跨來源 WebSocket、Ctrl+C、Resize、多 Session 實際互動：NOT RUN。

## 6. 安全提醒
Agent 可在登入者權限下執行任意本地命令。只使用可信任的 GitHub Pages 部署；不要分享配對 Token；不要以 Administrator 執行；不要將本機服務公開到網路。
