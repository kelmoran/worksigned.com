#!/usr/bin/env python
# Deterministic-ish video render of the staging2.html GSAP infographic.
# Loads the page in headless Chromium, records a video while the 10-step
# sequence auto-plays to completion (step 10 + a bit of the pulse), then stops.
# Uses the browser's real rendering (no frame-by-frame seek), so the clip
# matches exactly what a viewer sees.
import os, sys, time, pathlib
from playwright.sync_api import sync_playwright

URL   = os.environ.get("PW_URL", "http://127.0.0.1:9001/staging2.html")
THEME = os.environ.get("PW_THEME", "")   # "light" -> append ?theme=light
if THEME:
    sep = "&" if "?" in URL else "?"
    URL = URL + sep + "theme=" + THEME
OUT   = pathlib.Path(os.environ.get("PW_OUT", "/tmp/hf_render"))
W,H   = int(os.environ.get("PW_W","1280")), int(os.environ.get("PW_H","800"))
SCALE = int(os.environ.get("PW_SCALE","2"))   # deviceScaleFactor for crisp retina
# seconds to wait for the sequence to reach step 10 (final caption)
WAIT  = float(os.environ.get("PW_WAIT","45"))

OUT.mkdir(parents=True, exist_ok=True)
marker = OUT / "last_video.txt"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
    ctx = browser.new_context(
        viewport={"width": W, "height": H},
        device_scale_factor=SCALE,
        record_video_dir=str(OUT),
        record_video_size={"width": W, "height": H},
    )
    page = ctx.new_page()
    page.goto(URL, wait_until="networkidle")
    # let step 1 start
    time.sleep(1.0)
    # wait until the step-10 caption is on screen (sequence reached the end)
    deadline = time.time() + WAIT
    reached = False
    while time.time() < deadline:
        try:
            cap = page.text_content("#capEl")
            if cap and "in this order" in cap:
                reached = True
                break
        except Exception:
            pass
        time.sleep(0.2)
    # hold on step 10 long enough that the pulsating node is clearly seen (the
    # pulse repeats every ~1.6s; 8s captures ~5 pulses).
    time.sleep(8.0)
    video = page.video
    page.close()
    ctx.close()
    browser.close()
    assert reached, "sequence never reached step 10 within %ss" % WAIT
    # the video file path is known after close; it's the single *.webm in OUT
    vids = sorted(OUT.glob("*.webm"), key=lambda f: f.stat().st_mtime)
    final = vids[-1]
    print("VIDEO:", final, final.stat().st_size, "bytes")
    marker.write_text(str(final))
