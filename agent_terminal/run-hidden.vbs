Option Explicit
Dim shell, fso, here, cmd
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
cmd = "cmd.exe /d /c " & Chr(34) & Chr(34) & here & "\start-background.cmd" & Chr(34) & Chr(34)
shell.Run cmd, 0, False
