' 羊的教务管理系统 - 静默启动脚本
' 双击即可运行，无黑窗口，自动打开浏览器

Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
strPath = FSO.GetParentFolderName(WScript.ScriptFullName)

' 检查 Python
On Error Resume Next
WshShell.Exec "python --version"
If Err.Number <> 0 Then
    MsgBox "未检测到 Python，请安装 Python 3.10+ 并添加到环境变量", vbCritical, "启动失败"
    WScript.Quit 1
End If
On Error GoTo 0

' 安装依赖（静默）
WshShell.Run "cmd /c cd /d " & Chr(34) & strPath & Chr(34) & " && python -m pip install -q -r requirements.txt >nul 2>&1", 0, True

' 启动 Flask 服务器（隐藏窗口）
WshShell.Run "cmd /c cd /d " & Chr(34) & strPath & Chr(34) & " && python app.py", 0, False

' 等待 2 秒后打开浏览器
WScript.Sleep 2000
WshShell.Run "http://localhost:5000", 1, False

' 提示用户
MsgBox "教务系统已启动！" & vbCrLf & vbCrLf & "访问地址：http://localhost:5000" & vbCrLf & vbCrLf & "关闭此窗口不会影响服务运行。" & vbCrLf & "如需停止服务，请在任务管理器中结束 python.exe 进程。", vbInformation, "羊的教务管理系统"

Set WshShell = Nothing
Set FSO = Nothing
