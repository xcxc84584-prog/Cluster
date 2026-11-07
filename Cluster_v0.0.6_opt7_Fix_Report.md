# Cluster v0.0.6 opt7 — PowerShell 綁定無反應修復

## 問題
Agent 已連線，但 Explorer 無法辨識 Workspace 時，`pendingWorkspace` 為 `null`，按下 Bind and open PowerShell 會直接返回，沒有錯誤提示。

## 修改
- 在沒有 Explorer Workspace 的情況下，允許手動輸入絕對 Windows 目錄建立臨時 Workspace ID。
- 對輸入路徑做基本格式檢查，顯示錯誤而非靜默返回。
- 綁定前確保 xterm.js 載入，避免 Agent 建立 Session 後終端 UI 無法初始化。
- 保留多 Session 與既有 Agent 協定。

## 部署
1. 使用此 ZIP 替換原本的 `terminal_build`，或只替換 `plugin_terminal/terminal.js`。
2. 進入專案根目錄，執行 `git add plugin_terminal/terminal.js`、`git commit -m "Fix manual terminal workspace binding"`、`git push origin main`。
3. 等待 GitHub Pages 更新後使用 Ctrl+Shift+R 強制重新整理。
4. 確認本地 Agent 仍在執行，重新連線並輸入實際存在的 Windows 資料夾，例如 `C:\Users\Owner\Desktop\Project Cluster`。

## 驗證
- `node --check plugin_terminal/terminal.js`：PASS。
- `node --test tests/terminal-static.test.cjs`：6/6 PASS。
- 尚未於 Windows/Chrome 實測 ConPTY 和 GitHub Pages 連線。
