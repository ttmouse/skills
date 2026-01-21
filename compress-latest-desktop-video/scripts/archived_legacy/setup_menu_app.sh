#!/bin/bash

# 设置菜单栏监控应用

APP_DIR="$HOME/.claude/skills/compress-latest-desktop-video/scripts"
APP_NAME="VideoMonitor.app"
APP_PATH="$HOME/Desktop/$APP_NAME"

# 创建应用包结构
mkdir -p "$APP_PATH/Contents/MacOS"
mkdir -p "$APP_PATH/Contents/Resources"

# 创建 Info.plist
cat > "$APP_PATH/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>VideoMonitor</string>
    <key>CFBundleIdentifier</key>
    <string>com.videomonitor.app</string>
    <key>CFBundleName</key>
    <string>VideoMonitor</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSUIElement</key>
    <true/>
    <key>NSSupportsAutomaticTermination</key>
    <true/>
</dict>
</plist>
EOF

# 创建主程序（使用 swiftc）
cat > "$APP_PATH/Contents/MacOS/main.swift" << 'SWIFT_EOF'
import Cocoa
import Foundation

class VideoMonitorApp {
    private var statusItem: NSStatusItem?
    private var monitorProcess: Process?
    private var timer: Timer?

    func run() {
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)

        setupStatusBar()
        startMonitoring()

        app.run()
    }

    private func setupStatusBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        statusItem?.button?.image = NSImage(systemSymbolName: "eye", accessibilityDescription: "监控")
        statusItem?.button?.toolTip = "桌面视频监控"

        let menu = NSMenu()

        let statusMenuItem = NSMenuItem(title: "监控中", action: nil, keyEquivalent: "")
        statusMenuItem.tag = 1
        menu.addItem(statusMenuItem)

        menu.addItem(NSMenuItem.separator())

        let restart = NSMenuItem(title: "重新启动", action: #selector(restartMonitoring), keyEquivalent: "r")
        restart.target = self
        menu.addItem(restart)

        let stop = NSMenuItem(title: "停止监控", action: #selector(stopMonitoring), keyEquivalent: "s")
        stop.target = self
        menu.addItem(stop)

        menu.addItem(NSMenuItem.separator())

        let quit = NSMenuItem(title: "退出", action: #selector(quitApp), keyEquivalent: "q")
        quit.target = self
        menu.addItem(quit)

        statusItem?.menu = menu
    }

    @objc private func restartMonitoring() {
        stopMonitoring()
        Thread.sleep(forTimeInterval: 0.5)
        startMonitoring()
    }

    @objc private func stopMonitoring() {
        let script = "bash ~/.claude/skills/compress-latest-desktop-video/scripts/monitor_control.sh stop"
        try? shell(command: script)
        monitorProcess?.terminate()
        monitorProcess = nil

        statusItem?.button?.image = NSImage(systemSymbolName: "eye.slash", accessibilityDescription: "停止")
        statusItem?.menu?.items.first(where: { $0.tag == 1 })?.title = "已停止"
    }

    @objc private func quitApp() {
        stopMonitoring()
        NSApplication.shared.terminate(self)
    }

    private func startMonitoring() {
        let script = "bash ~/.claude/skills/compress-latest-desktop-video/scripts/monitor_control.sh start"
        try? shell(command: script)

        statusItem?.button?.image = NSImage(systemSymbolName: "eye", accessibilityDescription: "监控")
        statusItem?.menu?.items.first(where: { $0.tag == 1 })?.title = "监控中"
    }

    private func shell(command: String) throws {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/bin/bash")
        task.arguments = ["-c", command]
        try task.run()
        task.waitUntilExit()
    }
}

let app = VideoMonitorApp()
app.run()
SWIFT_EOF

# 编译
echo "正在编译菜单栏应用..."
cd "$APP_PATH/Contents/MacOS"
swiftc -o VideoMonitor main.swift
rm main.swift

echo "✅ 应用已创建: $APP_PATH"
echo ""
echo "使用方法:"
echo "  1. 双击桌面上的 VideoMonitor.app 启动"
echo "  2. 点击菜单栏中的 👁️ 图标进行控制"
echo "  3. 或使用命令: open \"$APP_PATH\""
