#!/usr/bin/env bash
# Claude Traffic Light — Connect to Claude Code (script du phong, Cach 2, Linux/macOS)
# Them 4 hooks vao ~/.claude/settings.json de Claude Code bao trang thai ve app.
# LUU Y: mirror logic cua desktop-app/hooksConfig.js — sua o do thi nho dong bo lai day.
# Yeu cau: python3 (co san tren hau het distro Linux).

set -euo pipefail

if ! command -v python3 >/dev/null 2>&1; then
  echo "Can python3 de chay script nay. Hay dung nut 'Connect to Claude' trong app hoac Cach 3 (copy prompt)." >&2
  exit 1
fi

python3 - <<'PY'
import json, os, sys

PORT = 7317
claude_dir = os.path.join(os.path.expanduser("~"), ".claude")
settings_path = os.path.join(claude_dir, "settings.json")
os.makedirs(claude_dir, exist_ok=True)

settings = {}
if os.path.exists(settings_path):
    raw = open(settings_path, encoding="utf-8").read().strip()
    if raw:
        try:
            settings = json.loads(raw)
        except ValueError:
            sys.exit(f"{settings_path} khong phai JSON hop le — sua tay roi chay lai.")

def cmd(status, message):
    body = json.dumps({"status": status, "message": message}, separators=(",", ":")).replace("'", "'\\''")
    return (f"curl -s -m 2 -X POST http://localhost:{PORT}/status "
            f"-H 'Content-Type: application/json' -d '{body}' >/dev/null 2>&1 || true")

def block(status, message, **extra):
    return {**extra, "hooks": [{"type": "command", "command": cmd(status, message)}]}

hook_defs = {
    "UserPromptSubmit": block("running", "Claude dang xu ly"),
    "PreToolUse": block("running", "Dang chay tool", matcher=""),
    "Notification": block("waiting", "Claude Code dang cho xac nhan"),
    "Stop": block("done", "Task da xong"),
}

hooks = settings.setdefault("hooks", {})
for event, new_block in hook_defs.items():
    # Don hook PowerShell cu cua app nay (khong chay duoc tren Linux/macOS)
    existing = []
    for b in hooks.get(event, []):
        kept = [h for h in b.get("hooks", [])
                if not (h.get("shell") == "powershell" and f":{PORT}/status" in str(h.get("command")))]
        if kept:
            existing.append({**b, "hooks": kept})
    new_cmd = new_block["hooks"][0]["command"]
    if not any(h.get("command") == new_cmd for b in existing for h in b.get("hooks", [])):
        existing.append(new_block)
    hooks[event] = existing

with open(settings_path, "w", encoding="utf-8") as f:
    json.dump(settings, f, indent=2, ensure_ascii=False)

print("Da ket noi Claude Traffic Light voi Claude Code!")
print(f"File: {settings_path}")
print("Hay khoi dong lai Claude Code de ap dung.")
PY
