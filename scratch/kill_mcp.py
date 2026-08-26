import psutil
import time

while True:
    try:
        for p in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                cmdline = p.info.get('cmdline') or []
                cmd_str = ' '.join(cmdline).lower()
                if 'mcp-remote' in cmd_str or 'chrome-devtools-mcp' in cmd_str:
                    p.kill()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except Exception:
        pass
    time.sleep(1)
