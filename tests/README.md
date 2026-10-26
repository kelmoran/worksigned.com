# Testing the worksigned.com site

Self-contained: all tests run from the sites venv, no v2 dependency.

    /home/ew3/agents/papertrail/project/sites/venv/bin/python <test>.py

The venv pins `playwright==1.62.0` (chromium-1234 is already downloaded in
~/.cache/ms-playwright; newer playwright builds are blocked by the firewall).

## web/tests/

- test_lightbox.py — the screenshot lightbox: open on click, full-size render,
  scroll lock, close via Escape / backdrop / X button, hero zoom,
  placeholders excluded. 10 checks.

Each test is self-cleaning (unique temp profile, reaps only its own chromium
PIDs on exit, SIGINT, or SIGTERM) — safe on this shared machine.

Screenshots land in /tmp/pi_test/.
