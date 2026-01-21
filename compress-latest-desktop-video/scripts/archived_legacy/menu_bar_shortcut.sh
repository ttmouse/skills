#!/bin/bash

# 简化的菜单栏控制 - 创建桌面快捷方式

SCRIPT_DIR="$HOME/.claude/skills/compress-latest-desktop-video/scripts"
DESKTOP="$HOME/Desktop"

# 创建桌面快捷方式
cat > "$DESKTOP/视频监控控制.command" << 'EOF'
#!/bin/bash

# 视频监控控制菜单

cd "$(dirname "$0")"

while true; do
    choice=$(osascript << 'SCRIPT'
    tell application "System Events"
        set result to display dialog "视频监控控制" buttons {"停止监控", "查看状态", "重新启动", "取消"} default button 4
        return button returned of result
    end tell
SCRIPT
)

    case "$choice" in
        "重新启动")
            bash ~/.claude/skills/compress-latest-desktop-video/scripts/monitor_control.sh restart
            ;;
        "查看状态")
            bash ~/.claude/skills/compress-latest-desktop-video/scripts/monitor_control.sh status
            read -p "按回车继续..."
            ;;
        "停止监控")
            bash ~/.claude/skills/compress-latest-desktop-video/scripts/monitor_control.sh stop
            break
            ;;
        "取消")
            break
            ;;
    esac
done
EOF

chmod +x "$DESKTOP/视频监控控制.command"

echo "✅ 已创建桌面快捷方式: 视频监控控制.command"
echo ""
echo "使用方法:"
echo "  双击桌面上的 '视频监控控制.command'"
echo "  或使用命令行:"
echo "    bash $SCRIPT_DIR/monitor_control.sh start   # 启动监控"
echo "    bash $SCRIPT_DIR/monitor_control.sh stop    # 停止监控"
echo "    bash $SCRIPT_DIR/monitor_control.sh status  # 查看状态"
