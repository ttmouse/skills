#!/bin/bash

# 创建统一菜单栏应用

MONITOR_CORE="$HOME/.claude/skills/compress-latest-desktop-video/scripts/monitor_framework/monitor_core.sh"
APP_DIR="$HOME/Desktop/TaskMonitor.app"

# 创建应用包结构
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

# 创建 Info.plist
cat > "$APP_DIR/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>TaskMonitor</string>
    <key>CFBundleIdentifier</key>
    <string>com.taskmonitor.app</string>
    <key>CFBundleName</key>
    <string>TaskMonitor</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSUIElement</key>
    <true/>
</dict>
</plist>
EOF

# 创建 Swift 主程序
cat > "$APP_DIR/Contents/MacOS/main.swift" << 'SWIFT_EOF'
import Cocoa
import Foundation

class TaskMonitorApp {
    private var statusItem: NSStatusItem?
    private var monitorScript: String
    private var updateTimer: Timer?

    init() {
        monitorScript = "\(NSHomeDirectory())/.claude/skills/compress-latest-desktop-video/scripts/monitor_framework/monitor_core.sh"
    }

    func run() {
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)

        setupStatusBar()
        startUpdateTimer()

        app.run()
    }

    private func setupStatusBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        statusItem?.button?.title = "⚡"
        statusItem?.button?.toolTip = "任务监控"

        refreshMenu()
    }

    @objc private func refreshMenu() {
        guard let menu = statusItem?.menu else { return }
        menu.removeAllItems()

        // 添加插件菜单
        addPluginsToMenu(menu)

        menu.addItem(NSMenuItem.separator())

        // 刷新按钮
        let refresh = NSMenuItem(title: "刷新", action: #selector(refreshMenu), keyEquivalent: "r")
        refresh.target = self
        menu.addItem(refresh)

        menu.addItem(NSMenuItem.separator())

        // 退出
        let quit = NSMenuItem(title: "退出", action: #selector(quitApp), keyEquivalent: "q")
        quit.target = self
        menu.addItem(quit)

        statusItem?.menu = menu
    }

    private func addPluginsToMenu(_ menu: NSMenu) {
        // 获取插件列表
        let output = shell(command: "\(monitorScript) list")
        let lines = output.components(separatedBy: "\n")

        for line in lines {
            if line.contains("🟢") || line.contains("⚪") {
                // 解析插件信息
                let components = line.components(separatedBy: " ")
                if let icon = components.first, let name = components.dropFirst().first {
                    let item = NSMenuItem(title: "\(icon) \(name)", action: nil, keyEquivalent: "")

                    // 根据图标状态设置菜单
                    if icon == "🟢" {
                        // 运行中
                        let submenu = NSMenu()

                        let stop = NSMenuItem(title: "停止", action: #selector(stopPlugin(_:)), keyEquivalent: "")
                        stop.tag = name.hashValue
                        stop.target = self
                        submenu.addItem(stop)

                        item.submenu = submenu
                    } else {
                        // 未运行
                        let submenu = NSMenu()

                        let start = NSMenuItem(title: "启动", action: #selector(startPlugin(_:)), keyEquivalent: "")
                        start.tag = name.hashValue
                        start.target = self
                        submenu.addItem(start)

                        // 检查是否是 action 类型
                        if isActionPlugin(name: name) {
                            submenu.addItem(NSMenuItem.separator())
                            let run = NSMenuItem(title: "执行", action: #selector(executePlugin(_:)), keyEquivalent: "")
                            run.tag = name.hashValue
                            run.target = self
                            submenu.addItem(run)
                        }

                        item.submenu = submenu
                    }

                    menu.addItem(item)
                }
            }
        }
    }

    private func isActionPlugin(name: String) -> Bool {
        let configPath = "\(NSHomeDirectory())/.claude/skills/compress-latest-desktop-video/scripts/monitor_framework/plugins/\(name)/plugin.conf"

        guard let content = try? String(contentsOfFile: configPath) else { return false }
        return content.contains("PLUGIN_TYPE=\"action\"")
    }

    @objc private func refreshMenu() {
        refreshMenu()
    }

    @objc private func startPlugin(_ sender: NSMenuItem) {
        let pluginName = getPluginName(from: sender)

        let _ = shell(command: "\(monitorScript) start \(pluginName)")
        refreshMenu()
    }

    @objc private func stopPlugin(_ sender: NSMenuItem) {
        let pluginName = getPluginName(from: sender)

        let _ = shell(command: "\(monitorScript) stop \(pluginName)")
        refreshMenu()
    }

    @objc private func executePlugin(_ sender: NSMenuItem) {
        let pluginName = getPluginName(from: sender)

        // 在后台执行
        let _ = shell(command: "\(monitorScript) exec \(pluginName)")
    }

    private func getPluginName(from item: NSMenuItem) -> String {
        // 从 tag 反向查找插件名称
        let output = shell(command: "\(monitorScript) list")
        let lines = output.components(separatedBy: "\n")

        for line in lines {
            if line.hashValue == item.tag {
                let components = line.components(separatedBy: " ")
                if components.count >= 2 {
                    return components[1]
                }
            }
        }

        return ""
    }

    private func startUpdateTimer() {
        updateTimer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in
            self?.refreshMenu()
        }
    }

    @objc private func quitApp() {
        // 停止所有插件
        let _ = shell(command: "\(monitorScript) stop-all")
        NSApplication.shared.terminate(self)
    }

    private func shell(command: String) -> String {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/bin/bash")
        task.arguments = ["-c", command]

        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = pipe

        do {
            try task.run()
            task.waitUntilExit()

            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            return String(data: data, encoding: .utf8) ?? ""
        } catch {
            return ""
        }
    }
}

let app = TaskMonitorApp()
app.run()
SWIFT_EOF

# 编译
echo "正在编译统一菜单栏应用..."
cd "$APP_DIR/Contents/MacOS"
swiftc -o TaskMonitor main.swift
rm main.swift

# 设置执行权限
chmod +x "$MONITOR_CORE"
chmod +x "$APP_DIR/Contents/MacOS/TaskMonitor"
chmod +x "$HOME/.claude/skills/compress-latest-desktop-video/scripts/monitor_framework/plugins/"*/*.sh

echo "✅ 统一菜单栏应用已创建: $APP_DIR"
echo ""
echo "使用方法:"
echo "  1. 双击桌面上的 TaskMonitor.app 启动"
echo "  2. 菜单栏显示 ⚡ 图标"
echo "  3. 点击图标管理所有插件"
echo ""
echo "插件操作:"
echo "  - 🟢 插件名: 运行中 → 点击'停止'"
echo "  - ⚪ 插件名: 未运行 → 点击'启动'或'执行'"
