#!/bin/bash

# ==============================================================================
# TaskMonitor Monitor v3.0 (The "Queue & Hardware" Edition)
# ==============================================================================

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
set -o pipefail

DESKTOP="$HOME/Desktop"
STATE_DIR="/tmp/taskmonitor_monitor_state"
QUEUE_DIR="$STATE_DIR/queue"
LOG="/tmp/taskmonitor_monitor.log"
COMPRESS_EXE="$HOME/.claude/skills/compress-latest-desktop-video/scripts/compress_fast.sh"

mkdir -p "$QUEUE_DIR"

log() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] [$1] $2" | tee -a "$LOG"; }

# --- Cleanup ---
cleanup() {
    log "EXIT" "Cleaning up..."
    rm -f "$STATE_DIR/worker_running"
    exit 0
}
trap cleanup SIGINT SIGTERM

# --- Worker Function (The Serial Processor) ---
worker() {
    touch "$STATE_DIR/worker_running"
    while true; do
        # Find the oldest task in the queue
        task=$(ls -rt "$QUEUE_DIR" | head -n 1)
        if [[ -n "$task" ]]; then
            # The file name in queue is the path to the real file (base64 or just encoded)
            # For simplicity, we store the full path in the queue file's content
            video_path=$(cat "$QUEUE_DIR/$task")
            log "QUEUE" "Processing: $(basename "$video_path")"
            
            # Reset progress file before starting a new task to avoid stale data
            rm -f "$STATE_DIR/progress"
            
            if bash "$COMPRESS_EXE" "$video_path"; then
                log "SUCCESS" "Finished: $(basename "$video_path")"
                touch "$STATE_DIR/processed_$(basename "$video_path")"
            else
                log "ERROR" "Failed: $(basename "$video_path")"
            fi
            rm -f "$QUEUE_DIR/$task"
        fi
        sleep 2
    done
}

# Start the worker in background if not already running
if [[ ! -f "$STATE_DIR/worker_running" ]]; then
    worker >> "$LOG" 2>&1 &
fi

# --- The "Linus" Lock Check ---
check_lock() {
    local f="$1"
    lsof "$f" >/dev/null 2>&1 && return 0
    pgrep -x "ffmpeg" >/dev/null && return 0
    pgrep -x "ScreenCapture" >/dev/null && return 0
    return 1
}

log "INIT" "Monitor v3.0 started. Sequential queue engaged."

while true; do
    while IFS= read -r file; do
        [[ -z "$file" ]] && continue
        fname=$(basename "$file")
        
        # Skip if processed or in queue or compressing
        [[ -f "$STATE_DIR/processed_$fname" ]] && continue
        [[ -f "$QUEUE_DIR/$fname" ]] && continue
        
        if check_lock "$file"; then
            continue
        fi

        # Add to queue
        log "ENQUEUE" "Adding $fname to serial queue"
        echo "$file" > "$QUEUE_DIR/$fname"
        osascript -e "display notification \"发现新素材: $fname，已加入待压缩队列\" with title \"TaskMonitor\""
        
    done < <(find "$DESKTOP" -maxdepth 1 -type f \( -name "*.mp4" -o -name "*.mov" \) -mmin -1 ! -name "*compressed*" 2>/dev/null)

    sleep 1.5
done
