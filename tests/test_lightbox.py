#!/usr/bin/env python3
"""Lightbox test for the worksigned.com landing page (local server on :9001).
Verifies: click opens full-size image over dimmed backdrop, scroll lock,
close via Escape / backdrop click / X button, hero zoom, placeholders excluded.
Self-cleaning: unique temp profile, reaps only its own chromium PIDs.
"""
import os, sys, atexit, signal, tempfile, time

BASE = "http://127.0.0.1:9001/"
OUT = "/tmp/pi_test"
os.makedirs(OUT, exist_ok=True)

MY_DIR = tempfile.mkdtemp(prefix="ws_lb_test_")
browser = None
pw = None

def reap():
    global browser, pw
    try:
        if browser:
            browser.close()
    except Exception:
        pass
    try:
        if pw:
            pw.stop()
    except Exception:
        pass
    import subprocess
    pid = str(os.getpid())
    try:
        out = subprocess.check_output(["/usr/bin/pgrep", "-P", pid]).decode()
    except Exception:
        out = ""
    for p in out.split():
        try:
            os.kill(int(p), signal.SIGTERM)
        except Exception:
            pass
    time.sleep(0.5)
    for p in out.split():
        try:
            os.kill(int(p), signal.SIGKILL)
        except Exception:
            pass

atexit.register(reap)
signal.signal(signal.SIGTERM, lambda *a: (reap(), sys.exit(143)))
signal.signal(signal.SIGINT, lambda *a: (reap(), sys.exit(130)))

from playwright.sync_api import sync_playwright

pw = sync_playwright().start()
browser = pw.chromium.launch_persistent_context(
    os.path.join(MY_DIR, "prof"),
    headless=True,
    args=["--no-sandbox", "--disable-dev-shm-usage"],
)
page = browser.new_page()
page.set_viewport_size({"width": 1440, "height": 900})
page.goto(BASE, wait_until="networkidle", timeout=30000)
page.wait_for_timeout(800)

results = []

def check(name, cond):
    results.append((name, bool(cond)))
    print(("PASS" if cond else "FAIL"), name)

def click_vis(sel):
    page.evaluate(f"document.querySelector('{sel}').scrollIntoView({{block:'center'}})")
    page.wait_for_timeout(1400)
    page.locator(sel).click(force=True)
    page.wait_for_timeout(450)

# 1. record screenshot opens the lightbox
click_vis("#record .feat-visual")
st = page.evaluate("""() => { const lb = document.getElementById('img-lightbox');
    return {hidden: lb.hidden, src: document.getElementById('lb-img').src.split('/').pop(),
            ov: document.body.style.overflow}; }""")
check("lightbox opens on click (sheets.png)", st["hidden"] is False and st["src"] == "sheets.png")
check("body scroll locked", st["ov"] == "hidden")

# 2. image is full-size
box = page.evaluate("""() => { const r = document.getElementById('lb-img').getBoundingClientRect();
    return {w: Math.round(r.width)}; }""")
check("image full-size (>=1200w)", box["w"] >= 1200)
page.screenshot(path=os.path.join(OUT, "lb_open.png"))

# 3. Escape closes
page.keyboard.press("Escape")
page.wait_for_timeout(300)
check("escape closes", page.evaluate("() => document.getElementById('img-lightbox').hidden") is True)
check("body scroll restored", page.evaluate("() => document.body.style.overflow") == "")

# 4. backdrop click closes
click_vis("#work .feat-visual")
check("work opens (latex.png)", page.evaluate(
    "() => !document.getElementById('img-lightbox').hidden && document.getElementById('lb-img').src.split('/').pop() === 'latex.png'"))
page.mouse.click(12, 450)
page.wait_for_timeout(300)
check("backdrop click closes", page.evaluate("() => document.getElementById('img-lightbox').hidden") is True)

# 5. close button closes
click_vis("#chat .feat-visual")
page.locator("#lb-close").click(force=True)
page.wait_for_timeout(300)
check("close button closes", page.evaluate("() => document.getElementById('img-lightbox').hidden") is True)

# 6. hero showcase is zoomable
click_vis(".hero-showcase")
check("hero zoom opens docs.png", page.evaluate(
    "() => !document.getElementById('img-lightbox').hidden && document.getElementById('lb-img').src.split('/').pop() === 'docs.png'"))
page.keyboard.press("Escape")
page.wait_for_timeout(300)

# 7. placeholders are not clickable
check("placeholders not zoomable", page.evaluate(
    "() => Array.from(document.querySelectorAll('.feat-placeholder')).every(p => !p.closest('.zoomable'))"))

# 8. dark-mode look
page.evaluate("() => { try { localStorage.setItem('ws-theme','dark'); } catch(e){} }")
page.reload(wait_until="networkidle")
page.wait_for_timeout(800)
click_vis("#record .feat-visual")
page.screenshot(path=os.path.join(OUT, "lb_dark.png"))
page.keyboard.press("Escape")

n_fail = sum(1 for _, c in results if not c)
print("TOTAL: %d, FAIL: %d" % (len(results), n_fail))
reap()
sys.exit(1 if n_fail else 0)
