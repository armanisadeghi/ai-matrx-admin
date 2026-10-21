"""The in-box half of pw-cloud.mjs: runs INSIDE one run's sandbox machine, never on the Mac.

pw-cloud.mjs uploads this file to the run's own sandbox and calls it once per command through the
orchestrator's exec route, with a JSON request on stdin: {"cmd": ..., "args": [...], ...}. It drives the
Chromium that `launch` started in the same box (one box per run, so nothing else can answer on its port)
and prints exactly what pw.mjs prints for the same command. Screenshots come back as one
"[png base64] <data>" line that the client writes to the local path.
"""
from __future__ import annotations

import base64
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.request

PORT = 9222
HOME = os.path.expanduser("~")
PROFILE = os.path.join(HOME, "rt-profile")
CDP = f"http://127.0.0.1:{PORT}"


def cdp_up() -> bool:
    try:
        with urllib.request.urlopen(CDP + "/json/version", timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


def launch() -> None:
    if cdp_up():
        print("running")
        return
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        exe = p.chromium.executable_path
    if not os.path.exists(exe):
        subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    log = open(os.path.join(HOME, "rt-chrome.log"), "ab")
    subprocess.Popen([exe, "--headless=new", f"--remote-debugging-port={PORT}", f"--user-data-dir={PROFILE}",
                      "--window-size=1440,900", "--no-first-run", "--no-default-browser-check",
                      "--disable-dev-shm-usage", "about:blank"],
                     stdout=log, stderr=log, stdin=subprocess.DEVNULL, start_new_session=True)
    for _ in range(150):
        if cdp_up():
            print(f"started on {PORT}")
            return
        time.sleep(0.2)
    raise SystemExit("chrome did not start")


def main() -> None:
    req = json.loads(sys.stdin.read() or "{}")
    cmd, args = req.get("cmd"), req.get("args") or []
    if cmd == "launch":
        return launch()
    if not cdp_up():
        print("this run's browser is not running in its machine; use: start", file=sys.stderr)
        raise SystemExit(1)
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(CDP, timeout=15000)
        ctx = browser.contexts[0]
        pages = [pg for pg in ctx.pages if not pg.url.startswith("devtools")]
        page = pages[0] if pages else ctx.new_page()
        page.set_viewport_size({"width": 1440, "height": 900})
        try:
            page.evaluate("""() => { if (window.__rtErrs) return; window.__rtErrs = [];
              const orig = console.error; console.error = (...a) => { window.__rtErrs.push(a.map(String).join(' ').slice(0, 400)); orig(...a); }; }""")
        except Exception:
            pass
        L = lambda s: page.locator(s).first  # noqa: E731

        def out(v):
            print(v if isinstance(v, str) else json.dumps(v, indent=1))

        def cookies(cs):
            if cs:
                ctx.add_cookies(cs)

        if cmd == "goto":
            cookies(req.get("cookies"))
            page.goto(args[0], wait_until="load", timeout=120000)
            out(page.url)
        elif cmd == "signin":
            # Cookies were minted on the Mac over the Supabase auth API; no password reaches this box.
            cookies(req.get("cookies"))
            # Q-04 reads the clipboard after "Copy as Markdown"; a headless page has no person to grant it.
            ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin="https://www.aimatrx.com")
            page.goto("https://www.aimatrx.com/", wait_until="load", timeout=120000)
            page.wait_for_timeout(3000)
            path = re.sub(r"^https?://[^/]+", "", page.url).split("?")[0]
            signed_out = bool(re.search(r"/(login|sign-?in)", path))
            if not signed_out:
                try:
                    signed_out = page.locator("a[href*='/login'], a[href*='/sign-in']").first.is_visible()
                except Exception:
                    signed_out = False
            if signed_out:
                print(f"signin: cookie set but the site still shows a signed-out page ({path})", file=sys.stderr)
                raise SystemExit(1)
            out(f"signed in as {req['email']}")
        elif cmd == "url":
            out(page.url)
        elif cmd == "title":
            out(page.title())
        elif cmd == "text":
            mx = int(args[1]) if len(args) > 1 else 8000
            t = L(args[0]).inner_text() if args else page.evaluate("() => document.body.innerText")
            out(t[:mx])
        elif cmd == "find":
            out(page.evaluate("""(needle) => [...document.querySelectorAll('body *')].filter((e) => e.children.length < 3 && e.innerText && e.innerText.includes(needle) && e.getBoundingClientRect().width > 0).slice(0, 25).map((e) => { const b = e.getBoundingClientRect(); return { tag: e.tagName, role: e.getAttribute('role'), aria: e.getAttribute('aria-label'), text: e.innerText.slice(0, 80), x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; })""", " ".join(args)))
        elif cmd == "click":
            L(" ".join(args)).click(timeout=15000); out("clicked")
        elif cmd == "rclick":
            L(" ".join(args)).click(button="right", timeout=15000); out("right-clicked")
        elif cmd == "hover":
            L(" ".join(args)).hover(timeout=15000); out("hovered")
        elif cmd == "clickxy":
            page.mouse.click(float(args[0]), float(args[1])); out("clicked")
        elif cmd == "rclickxy":
            page.mouse.click(float(args[0]), float(args[1]), button="right"); out("right-clicked")
        elif cmd == "type":
            page.keyboard.type(" ".join(args), delay=10); out("typed")
        elif cmd == "press":
            page.keyboard.press(args[0]); out("pressed")
        elif cmd == "upload":
            d = tempfile.mkdtemp(prefix="rt-upload-")
            paths = []
            for f in req.get("files") or []:
                fp = os.path.join(d, os.path.basename(f["name"]))
                with open(fp, "wb") as fh:
                    fh.write(base64.b64decode(f["b64"]))
                paths.append(fp)
            L(args[0]).set_input_files(paths); out("uploaded")
        elif cmd == "eval":
            # Labeled so a script's own return value is never mistaken for page text (same as pw.mjs).
            print("[eval result] " + json.dumps(page.evaluate(" ".join(args))))
        elif cmd == "shot":
            print("[png base64] " + base64.b64encode(page.screenshot()).decode())
        elif cmd == "console":
            out(page.evaluate("() => { const e = window.__rtErrs ?? []; window.__rtErrs = []; return e; }"))
        elif cmd == "stop":
            try:
                browser.new_browser_cdp_session().send("Browser.close")
            except Exception:
                pass
            out("stopped")
        else:
            print(f"unknown command {cmd}", file=sys.stderr)
            raise SystemExit(2)


if __name__ == "__main__":
    main()
