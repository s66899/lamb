# -*- coding: utf-8 -*-
"""P14 回归汇总:一次跑完三轮 + 模板自检,并把结果打成人看得懂的表。

跑法:
    python t14_all.py

存在的意义:**「三轮都过」这句话本身需要被验证**。
三份测试是分开跑的,万一有人只跑了其中一份、或者改了代码只重跑了一份,
结论「3 轮全过」就变成一句没有依据的话。这里把它们收在一起,
任何一份没过就整体非零退出。
"""
from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

APP = Path(__file__).parent
PY = sys.executable
ROUNDS = [
    ("模板自检   ", "tpl_test.py"),
    ("第 1 轮 数据层", "t14_checklist.py"),
    ("第 2 轮 接口层", "t14_api.py"),
    ("第 3 轮 原生看板", "t14_native.py"),
    ("BOM 表分类解析  ", "t14_bomtables.py"),
    ("原生看板手动编辑", "t15_edit.py"),
    ("桌面路径      ", "t16_desktop.py"),
]


def run(label: str, script: str):
    t0 = time.time()
    p = subprocess.run([PY, "-u", "-X", "utf8", str(APP / script)],
                       capture_output=True, text=True,
                       encoding="utf-8", errors="replace", cwd=str(APP))
    dt = time.time() - t0
    out = p.stdout or ""
    n_pass = out.count("[PASS]")
    n_fail = out.count("[FAIL]")
    tail = [l for l in out.splitlines() if "全部通过" in l or "失败" in l]
    why = tail[-1].strip() if tail else (out.splitlines()[-1].strip()
                                         if out.strip() else "(无输出)")
    bad = [l.strip() for l in out.splitlines() if l.strip().startswith("- ")]
    # ★ 退出码非 0 但一条 FAIL 都没有 —— 说明是**崩了**,不是断言不过。
    #   早先只挑 `[FAIL]` 和 `- ` 两类行,于是崩溃现场整个被吞掉,
    #   汇总结论只写着「33 项通过」,看不出到底哪一行炸的。
    #   这里把尾部输出原样带出来。
    if p.returncode != 0 and n_fail == 0 and out:
        bad.append("↓ 崩溃现场(退出码 %d,没有 FAIL 说明是抛异常了)↓" % p.returncode)
        bad += ["   " + l for l in out.strip().splitlines()[-14:]]
    return {"label": label, "script": script, "code": p.returncode,
            "pass": n_pass, "fail": n_fail, "dt": dt, "why": why, "bad": bad,
            "stderr": (p.stderr or "").strip()}


def main() -> int:
    print("=" * 66)
    print("P14 加工后核对 / 新购件核对 —— 回归汇总")
    print("=" * 66)
    rows = [run(l, s) for l, s in ROUNDS]
    for r in rows:
        ok = r["code"] == 0 and r["fail"] == 0
        print(f"\n{'OK ' if ok else 'FAIL'}  {r['label']:<16} "
              f"{r['script']:<22} {r['pass']:>3} 项通过"
              + (f" / {r['fail']} 失败" if r["fail"] else "")
              + f"   {r['dt']:.1f}s")
        print(f"      {r['why']}")
        for b in r["bad"]:
            print(f"      {b}")
        if r["stderr"]:
            print("      stderr:", r["stderr"].splitlines()[-1][:100])
    npass = sum(r["pass"] for r in rows)
    nfail = sum(r["fail"] for r in rows)
    allok = all(r["code"] == 0 and r["fail"] == 0 for r in rows)
    print("\n" + "=" * 66)
    print(f"合计 {npass} 项通过" + (f",{nfail} 项失败" if nfail else ""))
    print("结论: " + ("全部通过" if allok else "**有没过,别急着往下走**"))
    print("=" * 66)
    return 0 if allok else 1


if __name__ == "__main__":
    sys.exit(main())