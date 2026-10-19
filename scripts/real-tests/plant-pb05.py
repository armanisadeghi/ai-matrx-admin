#!/usr/bin/env python3
# matrx-agent-traffic: exempt grader-only; saves one new version of one test-fixture file through the files door; no model call
"""GRADER ONLY: plant and restore the PB-05 fault. Never named in, or given to, a runner sheet.

  plant-pb05.py --plant      saves a new version of the Alder Creek CSV (inbound-oct16.csv) whose row 7 trailer is
                             TR-40971 instead of TR-40917 (POST /files/<id>/versions), reads files.files.checksum
                             back, and writes the grader plant record (fixture_check accepts exactly this change
                             for 2 hours and says only "N difference(s) accepted (grader record)")
  plant-pb05.py --restore    restores version 1 (POST /files/<id>/versions/1/restore), reads the checksum back
                             (start bytes: 0ec213c4a308...) and deletes the plant record

Between the two the grader dispatches a fresh runner on the ordinary sheet (pb05-send.py, no flags it has not
always had); the runner is not told a fault exists. Restoring adds a file version; fixture_check compares files
by checksum, so the restored file is a MATCH. Touches only the CSV in the Safety Net Real Tests organization.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import sys
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fixture_check  # noqa: E402

_spec = importlib.util.spec_from_file_location("pb05_send", Path(__file__).resolve().parent / "pb05-send.py")
if _spec is None or _spec.loader is None:
    raise SystemExit("cannot load pb05-send.py beside this script")
pb05 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pb05)

CSV_ID = "ff66152f-707a-454d-988e-afaccea05eb1"
START_SHA256 = "0ec213c4a3082bb59b8e54547ac8b0accb7575f3028e5675aa3f4e68ecf5e269"
PLANT_SHA256_PREFIX = "df49cbbd2dd4"
OLD_TRAILER, NEW_TRAILER = b"TR-40917", b"TR-40971"


def call(token: str, method: str, path: str, body: bytes | None = None, content_type: str | None = None) -> tuple[int, bytes]:
    headers = {"Authorization": "Bearer " + token, "X-Organization-Id": pb05.ORG,
               "User-Agent": "matrx-real-tests/1.0 (plant-pb05)", "X-Matrx-Agent-Traffic": "real-tests-plant-pb05"}
    if content_type:
        headers["Content-Type"] = content_type
    req = urllib.request.Request(pb05.SERVER + path, method=method, data=body, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def multipart(name: str, filename: str, data: bytes) -> tuple[bytes, str]:
    boundary = "----plant" + uuid.uuid4().hex
    head = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; filename=\"{filename}\"\r\n"
            "Content-Type: text/csv\r\n\r\n").encode()
    return head + data + f"\r\n--{boundary}--\r\n".encode(), f"multipart/form-data; boundary={boundary}"


def checksum() -> str:
    return fixture_check.Reader().one("files", "files", CSV_ID, "id,checksum")["checksum"]


def main() -> None:
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n\n")[0])
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--plant", action="store_true", help="save the CSV with row 7 trailer TR-40971 as a new version")
    group.add_argument("--restore", action="store_true", help="restore version 1 and delete the plant record")
    args = ap.parse_args()
    token = pb05.admin_token()
    now = datetime.now(timezone.utc).isoformat()
    if args.plant:
        status, start = call(token, "GET", f"/files/{CSV_ID}/versions/1/download")
        if status != 200 or hashlib.sha256(start).hexdigest() != START_SHA256:
            raise SystemExit(f"version 1 is not the start bytes (HTTP {status}, sha256 {hashlib.sha256(start).hexdigest()[:12]}); restore first")
        if start.count(OLD_TRAILER) != 1:
            raise SystemExit(f"expected exactly one {OLD_TRAILER.decode()} in the start bytes, found {start.count(OLD_TRAILER)}")
        planted = start.replace(OLD_TRAILER, NEW_TRAILER)
        if not hashlib.sha256(planted).hexdigest().startswith(PLANT_SHA256_PREFIX):
            raise SystemExit("the planted bytes do not hash to the documented df49cbbd...; stop")
        body, ctype = multipart("file", "inbound-oct16.csv", planted)
        status, raw = call(token, "POST", f"/files/{CSV_ID}/versions", body, ctype)
        print(f"planted at {now} (UTC): POST versions HTTP {status} {raw.decode('utf-8', 'replace')[:160]}")
        print(f"files.files.checksum now {checksum()[:12]}... (expected {PLANT_SHA256_PREFIX}...)")
        rec = fixture_check.write_plant_record("PB-05", "file_csv")
        print(f"grader record written for PB-05, expires {rec['expires_at']}"
              + ("" if rec["differs_from_manifest"] else " (the file does not differ from the manifest: record inert)"))
    else:
        status, raw = call(token, "POST", f"/files/{CSV_ID}/versions/1/restore")
        print(f"restored at {now} (UTC): POST restore HTTP {status} {raw.decode('utf-8', 'replace')[:160]}")
        got = checksum()
        print(f"files.files.checksum now {got[:12]}... ({'start bytes' if got == START_SHA256 else 'NOT the start bytes'})")
        print(f"grader record for PB-05: {'deleted' if fixture_check.delete_plant_record('PB-05') else 'none present'}")
        if got != START_SHA256:
            raise SystemExit(1)


if __name__ == "__main__":
    main()
