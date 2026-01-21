#!/bin/bash

# 创建简化版 TaskMonitor - 直接复用 VideoMonitor 的逻辑

APP_DIR="$HOME/Desktop/TaskMonitor.app"
MONITOR_CORE="$HOME/.claude/skills/compress-latest-desktop-video/scripts/monitor_control.sh"

# 清理并创建
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS"

# Info.plist
cat > "$APP_DIR/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>task_monitor</string>
    <key>CFBundleIdentifier</key>
    <string>com.taskmonitor.simple</string>
    <key>CFBundleName</key>
    <string>TaskMonitor</string>
    <key>LSUIElement</key>
    <true/>
</dict>
</plist>
EOF

# 主程序（复用 VideoMonitor.swift，改为调用 monitor_control.sh）
cat > "$APP_DIR/Contents/MacOS/task_monitor.sh" << 'SH_EOF'
#!/bin/bash

MONITOR_SCRIPT="$HOME/.claude/skills/compress-latest-desktop-video/scripts/monitor_control.sh"

while true; do
    action=$(osascript << 'APPLESCRIPT'
    tell application "System Events"
        set result to display dialog "TaskMonitor" buttons {"启动视频监控", "停止视频监控", "退出"} default button 3
        return button returned of result
    end tell
APPLESCRIPT
)

    case "$action" in
        "启动视频监控")
            bash "$MONITOR_SCRIPT" start
            ;;
        "停止视频监控")
            bash "$MONITOR_SCRIPT" stop
            ;;
        "退出")
            bash "$MONITOR_SCRIPT" stop
            exit 0
            ;;
    esac
    
    sleep 0.5
done
SH_EOF

chmod +x "$APP_DIR/Contents/MacOS/task_monitor.sh"

# Info.plist 中指定的可执行文件
ln -sf task_monitor.sh "$APP_DIR/Contents/MacOS/task_monitor"

echo "✅ 简化版 TaskMonitor 已创建: $APP_DIR"
echo "用法：双击打开，选择启动/停止视频监控"
