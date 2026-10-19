"""Does a door accept `scope_ids`? Read from the live server's OpenAPI document (no model call, no write).

Senders add scope_ids to a body only where the endpoint's request schema declares it; otherwise they
print one neutral note and send the body without it.
"""
from __future__ import annotations

import json
import re
import urllib.request

_cache: dict = {}


def _schema(doc: dict, s):
    seen = 0
    while isinstance(s, dict) and "$ref" in s and seen < 10:
        s = doc["components"]["schemas"].get(s["$ref"].split("/")[-1], {})
        seen += 1
    return s or {}


def _doc(server: str) -> dict:
    if server not in _cache:
        try:
            _cache[server] = json.load(urllib.request.urlopen(urllib.request.Request(server + "/openapi.json", headers={"User-Agent": "matrx-real-tests/1.0 (scope_probe)"}), timeout=60))
        except Exception:  # noqa: BLE001 - an unreadable document means "unknown", reported by the caller
            _cache[server] = {}
    return _cache[server]


def accepts_scope_ids(server: str, method: str, path: str) -> bool | None:
    """True/False from the live schema; None when the OpenAPI document or the path is not found."""
    doc = _doc(server)
    paths = doc.get("paths") or {}
    for template, item in paths.items():
        rx = "^" + "[^/]+".join(re.escape(part) for part in re.split(r"\{[^}]*\}", template)) + "$"
        if re.match(rx, path.split("?")[0]) and method.lower() in item:
            body = (item[method.lower()].get("requestBody") or {}).get("content", {}).get("application/json", {}).get("schema")
            if body is None:
                return None
            return "scope_ids" in (_schema(doc, body).get("properties") or {})
    return None


def with_scope(server: str, method: str, path: str, body: dict | None, scope: str, label: str) -> dict | None:
    """``body`` plus scope_ids=[scope] when the door accepts it; else the body unchanged and one neutral note."""
    if body is None or "scope_ids" in body:
        return body
    ok = accepts_scope_ids(server, method, path)
    if ok:
        return {**body, "scope_ids": [scope]}
    print(f"note: {label} sent without scope_ids ({'this door does not accept it yet' if ok is False else 'could not be read from the server schema'})")
    return body
