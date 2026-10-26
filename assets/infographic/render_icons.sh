#!/usr/bin/env python3
"""One-shot render of assets/infographic/index.html -> mounts_icons_light.png /
mounts_icons_dark.png (for the website showpiece). Headless chromium, one
instance, self-reaping. Re-run any time the icons.json or the page changes."""
import os
import signal
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
VENV = "/home/ew3/agents/papertrail/project/v3/electron/tests/venv/bin/python"
PROFILE = "/tmp/ws_wf_icons_" + str(os.getpid())

children = []


def reap(*_):
    for p in children:
        try:
            p.kill()
        except Exception:
            pass
    sys.exit(0)


signal.signal(signal.SIGINT, reap)
signal.signal(signal.SIGTERM, reap)

proc = subprocess.Popen(["python3", "-m", "http.server", "8993", "--bind", "127.0.0.1", "--directory", WEB],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
children.append(proc)
time.sleep(1.2)

script = os.path.join(HERE, "_render_icons.py")
env = dict(os.environ)
p = subprocess.Popen([VENV, script, PROFILE], env=env)
children.append(p)
try:
    rc = p.wait(timeout=60)
finally:
    proc.kill()
    try:
        import shutil
        shutil.rmtree(PROFILE, ignore_errors=True)
    except Exception:
        pass
sys.exit(rc)
