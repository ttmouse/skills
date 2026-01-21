#!/bin/bash

# 配置
COUNTDOWN=3   # 倒计时秒数
DURATION=5     # 录制时长
OUTPUT_DIR="$HOME/Desktop"  # 输出目录：桌面

# 确保输出目录存在
mkdir -p "$OUTPUT_DIR"

# 倒计时函数
countdown() {
    echo "⏱️  $COUNTDOWN 秒后开始录制，请切换到目标窗口..."
    for i in $(seq $COUNTDOWN -1 1); do
        echo -en "\r$i 秒...       "
        sleep 1
    done
    echo -e "\r开始录制！          "
}

# 显示倒计时
countdown
echo ""

# 获取窗口信息（使用 Swift 获取）
WINDOW_INFO=$(swift - <<'EOF'
import Cocoa
import ApplicationServices

guard let frontmostApp = NSWorkspace.shared.frontmostApplication,
      let screen = NSScreen.main else {
    exit(1)
}

let scaleFactor = screen.backingScaleFactor
let appPid = frontmostApp.processIdentifier
let appElement = AXUIElementCreateApplication(appPid)

var window: AnyObject?
AXUIElementCopyAttributeValue(appElement, kAXMainWindowAttribute as CFString, &window)

guard let windowElement = window else { exit(1) }

var positionValue: AnyObject?
var sizeValue: AnyObject?
AXUIElementCopyAttributeValue(windowElement as! AXUIElement, kAXPositionAttribute as CFString, &positionValue)
AXUIElementCopyAttributeValue(windowElement as! AXUIElement, kAXSizeAttribute as CFString, &sizeValue)

guard let positionPoint = positionValue as! AXValue?,
      let sizePoint = sizeValue as! AXValue? else { exit(1) }

var position = CGPoint.zero
var size = CGSize.zero
AXValueGetValue(positionPoint, .cgPoint, &position)
AXValueGetValue(sizePoint, .cgSize, &size)

// 输出物理像素（格式：x:y:w:h）
print("\(Int(position.x * scaleFactor)):\(Int(position.y * scaleFactor)):\(Int(size.width * scaleFactor)):\(Int(size.height * scaleFactor))")
EOF
)

# 解析窗口信息
X=$(echo $WINDOW_INFO | cut -d':' -f1)
Y=$(echo $WINDOW_INFO | cut -d':' -f2)
W=$(echo $WINDOW_INFO | cut -d':' -f3)
H=$(echo $WINDOW_INFO | cut -d':' -f4)

# 输出文件（保存到桌面）
OUTPUT="$OUTPUT_DIR/recording_$(date +%Y%m%d_%H%M%S).mp4"

echo "=== 录制窗口 ==="
echo "位置: ($X, $Y)"
echo "尺寸: ${W}x${H}"
echo "输出: $OUTPUT"
echo "录制时长: ${DURATION}秒"
echo ""
echo "正在录制..."

# 使用 FFmpeg 录制（后台运行）
timeout $((DURATION + 2)) ffmpeg -f avfoundation -i "4:none" -vf "crop=${W}:${H}:${X}:${Y}" -t $DURATION -y "$OUTPUT" -loglevel error 2>&1 &
FFMPEG_PID=$!

# 等待进程
wait $FFMPEG_PID 2>/dev/null
RESULT=$?

# 强制清理
kill -9 $FFMPEG_PID 2>/dev/null

echo ""
if [ -f "$OUTPUT" ] && [ -s "$OUTPUT" ]; then
    echo "✓ 录制成功"
    ls -lh "$OUTPUT" | awk '{print "  大小: " $5}'
    echo "📁 文件已保存到桌面"
else
    echo "✗ 录制失败"
    exit 1
fi
