-- Video Monitor Menu Bar App
-- 使用 AppleScript 创建简单的菜单栏控制

property monitorPID : 0
property isMonitoring : false

on run
    -- 显示控制菜单
    set action to button returned of (display dialog "桌面视频监控控制" buttons ["启动监控", "停止监控", "查看状态", "退出"] default button 4 with title "VideoMonitor")

    if action = "启动监控" then
        startMonitoring()
    else if action = "停止监控" then
        stopMonitoring()
    else if action = "查看状态" then
        checkStatus()
    end if
end run

on startMonitoring()
    try
        set scriptPath to (POSIX path of (path to home folder)) & ".claude/skills/compress-latest-desktop-video/scripts/monitor_control.sh"
        do shell script "bash " & quoted form of scriptPath & " start"

        display notification "👀 监控已启动" with title "VideoMonitor"
        set isMonitoring to true
    on error errMsg
        display alert "启动失败: " & errMsg
    end try
end startMonitoring

on stopMonitoring()
    try
        set scriptPath to (POSIX path of (path to home folder)) & ".claude/skills/compress-latest-desktop-video/scripts/monitor_control.sh"
        do shell script "bash " & quoted form of scriptPath & " stop"

        display notification "⏹️ 监控已停止" with title "VideoMonitor"
        set isMonitoring to false
    on error errMsg
        display alert "停止失败: " & errMsg
    end try
end stopMonitoring

on checkStatus()
    try
        set scriptPath to (POSIX path of (path to home folder)) & ".claude/skills/compress-latest-desktop-video/scripts/monitor_control.sh"
        set statusResult to do shell script "bash " & quoted form of scriptPath & " status"

        display dialog statusResult buttons ["确定"] default button 1 with title "监控状态"
    on error errMsg
        display alert "状态查询失败: " & errMsg
    end try
end checkStatus
