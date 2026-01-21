#!/usr/bin/env swift

import Cocoa
import Foundation

class VideoMonitorApp {
    private var statusItem: NSStatusItem?
    private var monitorTask: Process?
    private var logFileHandle: FileHandle?

    func run() {
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory) // 不显示 Dock 图标

        createStatusBarItem()
        startMonitoring()

        app.run()
    }

    private func createStatusBarItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        statusItem?.button?.title = "👀"
        statusItem?.button?.toolTip = "桌面视频监控"

        let menu = NSMenu()

        menu.addItem(NSMenuItem.separator())

        let statusItem = NSMenuItem(title: "状态: 监控中", action: nil, keyEquivalent: "")
        statusItem.tag = 100
        menu.addItem(statusItem)

        menu.addItem(NSMenuItem.separator())

        let restartItem = NSMenuItem(title: "重新启动", action: #selector(restartMonitoring), keyEquivalent: "r")
        restartItem.target = self
        menu.addItem(restartItem)

        let stopItem = NSMenuItem(title: "停止监控", action: #selector(stopMonitoring), keyEquivalent: "s")
        stopItem.target = self
        menu.addItem(stopItem)

        menu.addItem(NSMenuItem.separator())

        let quitItem = NSMenuItem(title: "退出", action: #selector(quitApp), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)

        statusItem?.menu = menu
    }

    private func startMonitoring() {
        stopMonitoring() // 先停止已有的

        let scriptPath = "\(NSHomeDirectory())/.claude/skills/compress-latest-desktop-video/scripts/monitor.sh"
        let logPath = "/tmp/video_monitor.log"
        let pidPath = "/tmp/video_monitor.pid"

        monitorTask = Process()
        monitorTask?.executableURL = URL(fileURLWithPath: "/bin/bash")
        monitorTask?.arguments = [scriptPath]
        monitorTask?.standardOutput = FileHandle(forWritingAtPath: logPath)
        monitorTask?.standardError = FileHandle(forWritingAtPath: logPath)

        do {
            try monitorTask?.run()
            if let pid = monitorTask?.processIdentifier {
                try String(pid).write(toFile: pidPath, atomically: true, encoding: .utf8)
                updateStatus(title: "状态: 监控中")
            }
        } catch {
            print("启动监控失败: \(error)")
            updateStatus(title: "状态: 启动失败")
        }
    }

    @objc private func restartMonitoring() {
        updateStatus(title: "状态: 重启中...")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.startMonitoring()
        }
    }

    @objc private func stopMonitoring() {
        monitorTask?.terminate()
        monitorTask = nil

        // 清理 PID 文件
        try? FileManager.default.removeItem(atPath: "/tmp/video_monitor.pid")

        updateStatus(title: "状态: 已停止")
    }

    @objc private func quitApp() {
        stopMonitoring()
        NSApplication.shared.terminate(self)
    }

    private func updateStatus(title: String) {
        statusItem?.menu?.item(withTag: 100)?.title = title
    }
}

// 运行应用
let app = VideoMonitorApp()
app.run()
