#!/usr/bin/env bash
# Start Job Monitor in a detached tmux session.
# Add this to your .bashrc to auto-start on terminal open:
#   ~/ruta/al/job-monitor/start.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION="job-monitor"

if tmux has-session -t "$SESSION" 2>/dev/null; then
  exit 0
fi

cd "$SCRIPT_DIR" || exit 1
tmux new-session -d -s "$SESSION" 'npm start'
