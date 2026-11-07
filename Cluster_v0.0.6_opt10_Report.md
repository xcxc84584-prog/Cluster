# Cluster v0.0.6 opt10｜Explorer Terminal / 撤銷配對 / 關閉教程

## 更新
1. Explorer 每個資料夾操作列增加 `⌁`，按下後以該項目所屬的頂層 Root 開啟 PowerShell。若 Root 尚未綁定，提示輸入該 Root 的 Windows 絕對路徑。
2. Terminal 設定新增「卸載本地許可權／撤銷配對」，已連線時通知 Agent 輪換配對 Token、關閉所有 Session 並清除瀏覽器 Token 與記住的路徑。未連線時只能清除瀏覽器資料，不能撤銷 Agent 憑證。
3. 安裝教程新增「× 關閉教程」。

## 安全界線
- 「撤銷配對」不等同於從 Windows 解除安裝 Agent，也不會移除登入自動啟動。
- 若要完全解除安裝，請先停止 Agent、移除 Startup 捷徑，再刪除 `%LOCALAPPDATA%\ClusterTerminalAgent`。
- Agent 只允許已配對連線進行撤銷。

## 驗證
- JavaScript 語法檢查及靜態檢查。
- 尚未在 Windows 實機完成整合測試。
