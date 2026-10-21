"""The in-box half of pw-cloud.mjs: runs INSIDE one run's sandbox machine, never on the Mac.

pw-cloud.mjs uploads this file to the run's own sandbox and calls it once per command through the
orchestrator's exec route, with a JSON request on stdin: {"cmd": ..., "args": [...], ...}. That call is a thin
client: it hands the request to this run's resident driver (`--serve`) over a local socket and prints what the
driver answers, which is exactly what pw.mjs prints for the same command. Screenshots come back as one
"[png base64] <data>" line that the client on the Mac writes to the local path.

Why a resident driver (2026-10-21): connecting to Chromium anew for every command (pw.mjs's way) blurs and
resizes the window on each attach, so an open menu closed before the next command could use it ("More actions"
never opened in any Q-04 run). One process now holds the one connection for the whole run, and also hears every
console message, page loads included.
"""
from __future__ import annotations

import base64
import contextlib
import io
import json
import os
import re
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

PORT = 9222
# Everything this run owns lives in the container's own /tmp, never under ~: every box of one account mounts the
# SAME persistent home, so a profile there was shared by concurrent runs (cookies included) and the second run's
# Chrome found the first one's profile lock and exited ("chrome did not start", q04-cloud-r2, 2026-10-21).
HOME = "/tmp/rt"
os.makedirs(HOME, exist_ok=True)
PROFILE = os.path.join(HOME, "profile")
SOCK = os.path.join(HOME, "driver.sock")
CDP = f"http://127.0.0.1:{PORT}"


def cdp_up() -> bool:
    try:
        with urllib.request.urlopen(CDP + "/json/version", timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


def _log():
    return open(os.path.join(HOME, "chrome.log"), "ab")


def start_driver() -> bool:
    """Starts the resident driver (if it is not answering) and waits for its socket."""
    if driver_up():
        return True
    with contextlib.suppress(FileNotFoundError):
        os.unlink(SOCK)
    log = _log()
    subprocess.Popen([sys.executable, os.path.abspath(__file__), "--serve"], stdout=log, stderr=log,
                     stdin=subprocess.DEVNULL, start_new_session=True)
    for _ in range(150):
        if driver_up():
            return True
        time.sleep(0.2)
    return False


def driver_up() -> bool:
    try:
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as s:
            s.settimeout(2)
            s.connect(SOCK)
            s.sendall(b'{"cmd": "__ping"}')
            s.shutdown(socket.SHUT_WR)
            return b"pong" in s.recv(64)
    except Exception:
        return False


def launch() -> None:
    if cdp_up():
        print("running" if start_driver() else "browser running but its driver did not start")
        return
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        exe = p.chromium.executable_path
    if not os.path.exists(exe):
        subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    log = _log()
    subprocess.Popen([exe, "--headless=new", f"--remote-debugging-port={PORT}", f"--user-data-dir={PROFILE}",
                      "--window-size=1440,900", "--no-first-run", "--no-default-browser-check",
                      "--disable-dev-shm-usage", "about:blank"],
                     stdout=log, stderr=log, stdin=subprocess.DEVNULL, start_new_session=True)
    for _ in range(150):
        if cdp_up():
            if not start_driver():
                raise SystemExit("chrome started but its driver did not")
            print(f"started on {PORT}")
            return
        time.sleep(0.2)
    raise SystemExit("chrome did not start")


def serve() -> None:
    """The resident driver: one connection to this box's Chromium for the whole run; one command at a time."""
    from playwright.sync_api import sync_playwright

    console: list[str] = []

    def keep(line):
        console.append(line)
        del console[:-2000]  # nobody reading `console` must not grow the driver without bound

    def attach(pg):
        pg.on("console", lambda m: m.type in ("error", "warning") and keep(f"[{m.type}] {m.text[:400]}"))
        pg.on("pageerror", lambda e: keep(f"[pageerror] {str(e)[:400]}"))

    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(CDP, timeout=15000)
        ctx = browser.contexts[0]
        for pg in ctx.pages:
            attach(pg)
        ctx.on("page", attach)
        # Q-04 reads the clipboard after "Copy as Markdown"; a headless page has no person to grant it.
        with contextlib.suppress(Exception):
            ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin="https://www.aimatrx.com")

        def page():
            pages = [pg for pg in ctx.pages if not pg.url.startswith("devtools")]
            pg = pages[0] if pages else ctx.new_page()
            if pg.evaluate("() => [innerWidth, innerHeight]") != [1440, 900]:
                pg.set_viewport_size({"width": 1440, "height": 900})
            return pg

        with contextlib.suppress(FileNotFoundError):
            os.unlink(SOCK)
        srv = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        srv.bind(SOCK)
        srv.listen(4)
        srv.settimeout(0.05)
        try:
            while browser.is_connected():
                try:
                    conn, _ = srv.accept()
                except socket.timeout:
                    # The sync API delivers page events only inside a call, so the idle loop waits inside one.
                    try:
                        ctx.pages[0].wait_for_timeout(50)
                    except Exception:
                        time.sleep(0.05)
                    continue
                with conn:
                    conn.settimeout(30)
                    raw = b""
                    while chunk := conn.recv(1 << 20):
                        raw += chunk
                    req = json.loads(raw or b"{}")
                    if req.get("cmd") == "__ping":
                        conn.sendall(b"pong")
                        continue
                    reply = run(req, browser, ctx, page, console)
                    conn.sendall(json.dumps(reply).encode())
                    if req.get("cmd") == "stop":
                        break
        finally:
            srv.close()
            with contextlib.suppress(FileNotFoundError):
                os.unlink(SOCK)


def run(req, browser, ctx, get_page, console) -> dict:
    out_buf, err_buf, code = io.StringIO(), io.StringIO(), 0
    with contextlib.redirect_stdout(out_buf), contextlib.redirect_stderr(err_buf):
        try:
            handle(req, browser, ctx, get_page(), console)
        except SystemExit as e:
            code = e.code if isinstance(e.code, int) else 1
            if isinstance(e.code, str):
                print(e.code, file=sys.stderr)
        except Exception as e:  # the command failed; the driver lives on for the next one
            code = 1
            print(f"{type(e).__name__}: {e}", file=sys.stderr)
    return {"exit_code": code, "stdout": out_buf.getvalue(), "stderr": err_buf.getvalue()}


def handle(req, browser, ctx, page, console) -> None:
    cmd, args = req.get("cmd"), req.get("args") or []
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
        # Every console error/warning and page error since the last call, page loads included.
        out(console[:])
        console.clear()
    elif cmd == "stop":
        with contextlib.suppress(Exception):
            browser.new_browser_cdp_session().send("Browser.close")
        out("stopped")
    else:
        print(f"unknown command {cmd}", file=sys.stderr)
        raise SystemExit(2)


def main() -> None:
    if "--serve" in sys.argv:
        return serve()
    req = json.loads(sys.stdin.read() or "{}")
    if req.get("cmd") == "launch":
        return launch()
    if not cdp_up():
        print("this run's browser is not running in its machine; use: start", file=sys.stderr)
        raise SystemExit(1)
    if not start_driver():  # a box started by an older driver version gets its resident driver here
        print("this run's browser is running but its driver did not start", file=sys.stderr)
        raise SystemExit(1)
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as s:
        s.settimeout(200)
        s.connect(SOCK)
        s.sendall(json.dumps(req).encode())
        s.shutdown(socket.SHUT_WR)
        raw = b""
        while chunk := s.recv(1 << 20):
            raw += chunk
    reply = json.loads(raw)
    sys.stdout.write(reply["stdout"])
    sys.stderr.write(reply["stderr"])
    raise SystemExit(reply["exit_code"])


if __name__ == "__main__":
    main()
