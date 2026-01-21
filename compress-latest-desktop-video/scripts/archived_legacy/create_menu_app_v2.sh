#!/bin/bash

# 创建统一菜单栏应用 v2 - 简化版

MONITOR_CORE="$HOME/.claude/skills/compress-latest-desktop-video/scripts/monitor_framework/monitor_core.sh"
APP_DIR="$HOME/Desktop/TaskMonitor.app"

# 清理旧应用
rm -rf "$APP_DIR"

# 创建应用包结构
mkdir -p "$APP_DIR/Contents/MacOS"

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

    init() {
        monitorScript = "\(NSHomeDirectory())/.claude/skills/compress-latest-desktop-video/scripts/monitor_framework/monitor_core.sh"
    }

    func run() {
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)

        setupStatusBar()

        app.run()
    }

    private func setupStatusBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        statusItem?.button?.title = "⚡ 任务监控"
        statusItem?.button?.toolTip = "点击管理插件"

        let menu = NSMenu()

        // 添加插件列表
        addPluginsToMenu(menu)

        menu.addItem(NSMenuItem.separator())

        let refresh = NSMenuItem(title: "刷新", action: #selector(doRefresh), keyEquivalent: "r")
        refresh.target = self
        menu.addItem(refresh)

        menu.addItem(NSMenuItem.separator())

        let quit = NSMenuItem(title: "退出", action: #selector(quitApp), keyEquivalent: "q")
        quit.target = self
        menu.addItem(quit)

        statusItem?.menu = menu
    }

    private func addPluginsToMenu(_ menu: NSMenu) {
        let output = shell(command: "\(monitorScript) list")
        let lines = output.components(separatedBy: "\n")

        for line in lines {
            if line.contains("⚪") || line.contains("🟢") {
                // 解析插件信息
                let trimmed = line.trimmingCharacters(in: .whitespaces)
                if let spaceIndex = trimmed.firstIndex(of: " ") {
                    let icon = String(trimmed[..<spaceIndex])
                    let name = String(trimmed[spaceIndex...]).trimmingCharacters(in: .whitespaces)

                    let item = NSMenuItem(title: "\(icon) \(name)", action: nil, keyEquivalent: "")

                    // 创建子菜单
                    let submenu = NSMenu()

                    if icon == "🟢" {
                        let stop = NSMenuItem(title: "停止", action: #selector(stopPlugin), keyEquivalent: "")
                        stop.representedObject = name
                        stop.target = self
                        submenu.addItem(stop)
                    } else {
                        let start = NSMenuItem(title: "启动", action: #selector(startPlugin), keyEquivalent: "")
                        start.representedObject = name
                        start.target = self
                        submenu.addItem(start)

                        // 检查是否是 action 类型
                        if isActionPlugin(name: name) {
                            let run = NSMenuItem(title: "执行", action: #selector(executePlugin), keyEquivalent: "")
                            run.representedObject = name
                            run.target = self
                            submenu.addItem(run)
                        }
                    }

                    item.submenu = submenu
                    menu.addItem(item)
                }
            }
        }
    }

    private func isActionPlugin(name: String) -> Bool {
        let configPath = "\(NSHomeDirectory())/.claude/skills/compress-latest-desktop-video/scripts/monitor_framework/plugins/\(name)/plugin.conf"

        guard let content = try? String(contentsOfFile: configPath, encoding: .utf8) else {
            return false
        }
        return content.contains("PLUGIN_TYPE=\"action\"")
    }

    @objc private func doRefresh() {
        statusItem?.menu?.removeAllItems()

        let menu = NSMenu()
        addPluginsToMenu(menu)

        menu.addItem(NSMenuItem.separator())

        let refresh = NSMenuItem(title: "刷新", action: #selector(doRefresh), keyEquivalent: "r")
        refresh.target = self
        menu.addItem(refresh)

        menu.addItem(NSMenuItem.separator())

        let quit = NSMenuItem(title: "退出", action: #selector(quitApp), keyEquivalent: "q")
        quit.target = self
        menu.addItem(quit)

        statusItem?.menu = menu
    }

    @objc private func startPlugin(_ sender: NSMenuItem) {
        guard let name = sender.representedObject as? String else { return }
        let _ = shell(command: "\(monitorScript) start \(name)")
        doRefresh()
    }

    @objc private func stopPlugin(_ sender: NSMenuItem) {
        guard let name = sender.representedObject as? String else { return }
        let _ = shell(command: "\(monitorScript) stop \(name)")
        doRefresh()
    }

    @objc private func executePlugin(_ sender: NSMenuItem) {
        guard let name = sender.representedObject as? String else { return }

        // 在后台执行
        DispatchQueue.global().async {
            let _ = self.shell(command: "\(self.monitorScript) exec \(name)")
        }
    }

    @objc private func quitApp() {
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
echo "正在编译 TaskMonitor 应用..."
cd "$APP_DIR/Contents/MacOS"

if swiftc -o TaskMonitor main.swift 2>&1; then
    rm main.swift

    # 验证应用
    if [ -f "$APP_DIR/Contents/MacOS/TaskMonitor" ]; then
        echo "✅ TaskMonitor 应用创建成功"
        echo "📁 位置: $APP_DIR"
        echo ""
        echo "使用方法:"
        echo "  1. 双击桌面上的 TaskMonitor.app"
        echo "  2. 菜单栏显示 ⚡ 任务监控"
        echo "  3. 点击图标管理插件"
        echo ""
        echo "插件管理:"
        echo "  🟢 运行中 → 点击'停止'"
        echo "  ⚪ 未运行 → 点击'启动'或'执行'"
    else
        echo "❌ 应用编译失败"
    fi
else
    echo "❌ 编译失败，检查错误信息"
    exit 1
fi
