#!/usr/bin/env python3
"""Render the infographic page (light + dark) to PNG. Spawned by render_icons.sh.py."""
import os
import sys
import time
from playwright.sync_api import sync_playwright

profile = sys.argv[1] if len(sys.argv) > 1 else "/tmp/ws_wf_icons"
HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.abspath(os.path.join(HERE, ".."))


def shot(theme, out):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-gpu"])
        page = browser.new_page(viewport={"width": 900, "height": 560}, device_scale_factor=2)
        page.goto(f"http://127.0.0.1:8993/assets/infographic/index.html?theme={theme}", wait_until="networkidle")
        # wait for the tiles to be built (document title flips to ready:<theme>)
        for _ in range(60):
            if page.title().startswith("ready:"):
                break
            time.sleep(0.25)
        assert page.title().startswith("ready:"), "tiles did not load: " + page.title()
        page.wait_for_timeout(350)
        el = page.locator("#card")
        el.screenshot(path=out)
        browser.close()
    print("wrote", out)


shot("light", os.path.join(ASSETS, "mounts_icons_light.png"))
shot("dark", os.path.join(ASSETS, "mounts_icons_dark.png"))
