-- Desktop Video Monitor Menu Bar App
-- 使用 AppleScript 创建菜单栏监控图标

on run
    tell application "System Events"
        if not (exists process "VideoMonitor") then
            do shell script "nohup /bin/bash ~/.claude/skills/compress-latest-desktop-video/scripts/monitor.sh > /tmp/video_monitor.log 2>&1 & echo $! > /tmp/video_monitor.pid"
        end if
    end tell

    -- 创建菜单栏应用
    set monitorScript to load script (POSIX file (POSIX path of (path to me) & "::Menu.scpt"))

    tell monitorScript to startMonitoring()
end run

on idle
    return 60 -- 每分钟检查一次
end idle
