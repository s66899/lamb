# -*- coding: utf-8 -*-
"""🐑 助手工程师 —— 停止后台监听。"""

from __future__ import annotations

import ctypes
import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from engine import paths


def alive(pid: int) -> bool:
    """Windows 下安全判活(os.kill(pid,0) 会真的杀掉进程,不能用)。"""
    k = ctypes.windll.kernel32
    h = k.OpenProcess(0x1000, False, pid)
    if not h:
        return False
    try:
        code = ctypes.c_ulong()
        if not k.GetExitCodeProcess(h, ctypes.byref(code)):
            return False
        return code.value == 259          # STILL_ACTIVE
    finally:
        k.CloseHandle(h)


def read_pid() -> int | None:
    if not paths.PID_FILE.is_file():
        return None
    try:
        pid = int(paths.PID_FILE.read_text(encoding="utf-8").split()[0])
    except Exception:
        return None
    return pid if alive(pid) else None


def stop() -> int:
    pid = read_pid()
    if not pid:
        paths.PID_FILE.unlink(missing_ok=True)
        print("监听进程: 未运行")
        return 0
    subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"],
                   capture_output=True, text=True, errors="replace")
    import time
    time.sleep(0.6)
    if alive(pid):
        try:
            os.kill(pid, 15)
        except OSError:
            pass
    paths.PID_FILE.unlink(missing_ok=True)
    print(f"监听进程: 已停止 (PID {pid})")
    return 0


if __name__ == "__main__":
    sys.exit(stop())
