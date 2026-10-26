#!/home/ew3/agents/papertrail/sites/venv/bin/python
"""Scroll-spy test: click each sidebar link, verify it gets .active."""
import os
import signal
import subprocess
import sys
import tempfile
import time
import traceback

LINKS = [
    "Overview of the research record contents",
    "Research files",
    "Research data",
    "Research logs",
    "AI tool usage",
    "Research emails",
    "Web search history",
]
URL = "http://127.0.0.1:9001/section1.html"


def main():
    tmpdir = tempfile.mkdtemp(prefix="wsspy_")
    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as pw:
            ctx = pw.chromium.launch_persistent_context(
                tmpdir, headless=True, viewport={"width": 1280, "height": 900})
            page = ctx.new_page()
            page.goto(URL, wait_until="networkidle")
            page.wait_for_selector(".doc-sidebar a[href^='#']")
            ok = 0
            for text in LINKS:
                page.click(f'.doc-sidebar a:has-text("{text}")')
                page.wait_for_timeout(1000)  # wait for smooth scroll to settle
                active = page.evaluate(
                    "() => { const a = document.querySelector('.doc-sidebar a.active');"
                    " return a ? a.textContent : null; }")
                if active == text:
                    ok += 1
                    print(f"OK   {text}")
                else:
                    print(f"BAD  {text} (active={active})")
            print(f"PASS {ok}/{len(LINKS)}")
            ctx.close()
    finally:
        # kill leftover chromium children of this process by PID
        try:
            for line in subprocess.check_output(["pgrep", "-P", str(os.getpid())],
                                                text=True).split():
                try:
                    os.kill(int(line), signal.SIGKILL)
                except OSError:
                    pass
        except Exception:
            pass


if __name__ == "__main__":
    main()
