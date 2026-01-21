#!/bin/bash

# Monitor Shell Framework - 通用监控框架核心
# 插件式架构，支持不同类型的监控任务

MONITOR_DIR="$HOME/.claude/skills/compress-latest-desktop-video/scripts/monitor_framework"
PLUGINS_DIR="$MONITOR_DIR/plugins"
STATE_DIR="/tmp/monitor_framework"

# 创建必要的目录
mkdir -p "$PLUGINS_DIR" "$STATE_DIR"

# 插件状态文件
ACTIVE_PLUGINS="$STATE_DIR/active_plugins"
PLUGIN_PIDS="$STATE_DIR/plugin_pids"

# 初始化状态
init() {
    touch "$ACTIVE_PLUGINS" "$PLUGIN_PIDS"
    echo "✅ 监控框架已初始化"
}

# 列出所有可用插件
list_plugins() {
    echo "📦 可用插件:"
    echo ""
    for plugin_dir in "$PLUGINS_DIR"/*; do
        if [ -d "$plugin_dir" ]; then
            plugin_name=$(basename "$plugin_dir")
            plugin_config="$plugin_dir/plugin.conf"

            if [ -f "$plugin_config" ]; then
                source "$plugin_config"
                status_icon="⚪"

                if grep -qx "$plugin_name" "$ACTIVE_PLUGINS" 2>/dev/null; then
                    status_icon="🟢"
                fi

                echo "$status_icon $plugin_name"
                echo "   类型: $PLUGIN_TYPE"
                echo "   描述: $PLUGIN_DESC"
                echo ""
            fi
        fi
    done
}

# 启动插件
start_plugin() {
    local plugin_name=$1

    # 检查插件是否存在
    local plugin_dir="$PLUGINS_DIR/$plugin_name"
    if [ ! -d "$plugin_dir" ]; then
        echo "❌ 插件不存在: $plugin_name"
        return 1
    fi

    # 检查是否已在运行
    if grep -qx "$plugin_name" "$ACTIVE_PLUGINS" 2>/dev/null; then
        echo "⚠️  插件已在运行: $plugin_name"
        return 0
    fi

    # 加载插件配置
    local plugin_config="$plugin_dir/plugin.conf"
    source "$plugin_config"

    # 启动插件脚本
    local plugin_script="$plugin_dir/plugin.sh"
    if [ -f "$plugin_script" ]; then
        bash "$plugin_script" &
        local pid=$!

        # 记录状态
        echo "$plugin_name" >> "$ACTIVE_PLUGINS"
        echo "$plugin_name=$pid" >> "$PLUGIN_PIDS"

        echo "✅ 插件已启动: $plugin_name (PID: $pid)"
    else
        echo "❌ 插件脚本不存在: $plugin_script"
        return 1
    fi
}

# 停止插件
stop_plugin() {
    local plugin_name=$1

    # 检查是否在运行
    if ! grep -qx "$plugin_name" "$ACTIVE_PLUGINS" 2>/dev/null; then
        echo "⚠️  插件未运行: $plugin_name"
        return 0
    fi

    # 获取 PID
    local pid=$(grep "^${plugin_name}=" "$PLUGIN_PIDS" | cut -d= -f2)

    if [ -n "$pid" ]; then
        kill "$pid" 2>/dev/null
    fi

    # 移除状态记录
    sed -i '' "/^${plugin_name}=/d" "$PLUGIN_PIDS"
    sed -i '' "/^${plugin_name}$/d" "$ACTIVE_PLUGINS"

    echo "✅ 插件已停止: $plugin_name"
}

# 停止所有插件
stop_all() {
    while read -r plugin_name; do
        stop_plugin "$plugin_name"
    done < "$ACTIVE_PLUGINS"

    # 清空状态
    > "$ACTIVE_PLUGINS" "$PLUGIN_PIDS"

    echo "✅ 所有插件已停止"
}

# 获取插件状态
plugin_status() {
    echo "📊 插件状态:"
    echo ""

    if [ ! -s "$ACTIVE_PLUGINS" ]; then
        echo "⚪ 无插件运行中"
        return
    fi

    while read -r plugin_name; do
        local pid=$(grep "^${plugin_name}=" "$PLUGIN_PIDS" | cut -d= -f2)
        local plugin_dir="$PLUGINS_DIR/$plugin_name"
        local plugin_config="$plugin_dir/plugin.conf"

        if [ -f "$plugin_config" ]; then
            source "$plugin_config"

            # 检查进程状态
            local status="🟢 运行中"
            if ! ps -p "$pid" > /dev/null 2>&1; then
                status="🔴 已停止"
            fi

            echo "🟢 $plugin_name"
            echo "   类型: $PLUGIN_TYPE"
            echo "   PID: $pid"
            echo "   状态: $status"
            echo ""
        fi
    done < "$ACTIVE_PLUGINS"
}

# 执行插件（针对 action 类型）
execute_plugin() {
    local plugin_name=$1

    local plugin_dir="$PLUGINS_DIR/$plugin_name"
    local plugin_config="$plugin_dir/plugin.conf"

    if [ ! -f "$plugin_config" ]; then
        echo "❌ 插件不存在: $plugin_name"
        return 1
    fi

    source "$plugin_config"

    if [ "$PLUGIN_TYPE" != "action" ]; then
        echo "⚠️  此插件不支持手动执行: $plugin_name (类型: $PLUGIN_TYPE)"
        return 1
    fi

    local plugin_script="$plugin_dir/plugin.sh"
    if [ -f "$plugin_script" ]; then
        echo "🚀 执行插件: $plugin_name"
        bash "$plugin_script"
    else
        echo "❌ 插件脚本不存在: $plugin_script"
        return 1
    fi
}

# 主命令
case "$1" in
    init)
        init
        ;;
    list)
        list_plugins
        ;;
    start)
        shift
        for plugin in "$@"; do
            start_plugin "$plugin"
        done
        ;;
    stop)
        shift
        for plugin in "$@"; do
            stop_plugin "$plugin"
        done
        ;;
    stop-all)
        stop_all
        ;;
    status)
        plugin_status
        ;;
    exec)
        shift
        execute_plugin "$@"
        ;;
    *)
        echo "Monitor Shell Framework - 通用监控框架"
        echo ""
        echo "使用方法:"
        echo "  $0 init              - 初始化框架"
        echo "  $0 list              - 列出所有插件"
        echo "  $0 start <plugin>    - 启动插件"
        echo "  $0 stop <plugin>     - 停止插件"
        echo "  $0 stop-all          - 停止所有插件"
        echo "  $0 status            - 查看插件状态"
        echo "  $0 exec <plugin>     - 执行 action 类型插件"
        exit 1
        ;;
esac
