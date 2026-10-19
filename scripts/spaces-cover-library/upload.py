"""Upload the sourced Spaces cover photos to the file service as platform media (tooling, run once).

Each photo lands at ``system-files/spaces-covers/<key>.jpg`` in the Matrx System organization, owned by the
platform template owner (never a person), published to the web so anonymous gallery and public pages draw it
from the CDN. The file id is pinned (uuid5 of the key), so re-running writes a new version of the same file.
Prints the library manifest (JSON) that lib/spaces-blocks/cover-library.json is built from.

    cd ../aidream && uv run python ../matrx-frontend/scripts/spaces-cover-library/upload.py <sourced-dir> <out.json>
"""

from __future__ import annotations

import asyncio
import json
import sys
import uuid
from pathlib import Path

ROOT = "system-files/spaces-covers"
NS = uuid.UUID("6b1c0d3e-5a0f-4c39-9a51-7c0e0a1b5c0d")


def _thumb(content: bytes) -> bytes:
    """A 480px-wide JPEG copy for pickers and gallery cards."""
    import io

    from PIL import Image

    im = Image.open(io.BytesIO(content)).convert("RGB")
    im.thumbnail((480, 480 * im.height // im.width))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=78, optimize=True, progressive=True)
    return buf.getvalue()


def _size(content: bytes) -> tuple[int, int]:
    import io

    from PIL import Image

    return Image.open(io.BytesIO(content)).size


async def main() -> int:
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    sourced = json.loads((src / "sourced.json").read_text())

    from aidream.startup.worker_bootstrap import run_worker_bootstrap

    await run_worker_bootstrap(register_graph=False)

    from matrx_connect import system_app_context
    from matrx_files.service import FileService

    from aidream.services.organizations.effective_org import MATRX_SYSTEM_ORGANIZATION_ID
    from aidream.workflows.news_monitor_run_v1 import _template_owner
    from common.cloud_files import get_cloud_file_manager

    owner = await _template_owner()
    done = {e["key"]: e for e in json.loads(out.read_text())} if out.exists() else {}
    async with system_app_context(
        "script.spaces_cover_library",
        user_id=owner,
        organization_id=MATRX_SYSTEM_ORGANIZATION_ID,
        auth_type="token",
        is_authenticated=True,
        is_admin=True,
        store=True,
        is_internal_agent=False,
        request_id=str(uuid.uuid4()),
    ):
        service = FileService(get_cloud_file_manager())
        for e in sourced:
            if e["key"] in done and done[e["key"]].get("pexelsId") == e["pexelsId"] and done[e["key"]].get("thumbUrl"):
                continue
            file_id = str(uuid.uuid5(NS, f"spaces-cover:{e['key']}:{e['pexelsId']}"))
            content = await asyncio.to_thread((src / f"{e['key']}.jpg").read_bytes)
            result = await service.upload_simple(
                content,
                file_path=f"{ROOT}/{e['key']}.jpg",
                user_id=owner,
                organization_id=MATRX_SYSTEM_ORGANIZATION_ID,
                mime_type="image/jpeg",
                published_to_web=True,
                metadata={
                    "origin": "spaces-cover-library",
                    "system_artifact": True,
                    "source_url": e["sourceUrl"],
                    "photographer": e["photographer"],
                    "photographer_url": e["photographerUrl"],
                    "license": e["license"],
                    "license_url": e["licenseUrl"],
                },
                auto_thumbnail=False,
                file_id=file_id,
            )
            if not result.cdn_url:
                raise SystemExit(f"{e['key']}: no CDN url (is the public bucket configured?)")
            thumb = await service.upload_simple(
                await asyncio.to_thread(_thumb, content),
                file_path=f"{ROOT}/thumbs/{e['key']}.jpg",
                user_id=owner,
                organization_id=MATRX_SYSTEM_ORGANIZATION_ID,
                mime_type="image/jpeg",
                published_to_web=True,
                metadata={"origin": "spaces-cover-library", "system_artifact": True, "thumbnail_of": str(result.file_id)},
                auto_thumbnail=False,
                file_id=str(uuid.uuid5(NS, f"spaces-cover-thumb:{e['key']}:{e['pexelsId']}")),
            )
            width, height = await asyncio.to_thread(_size, content)
            done[e["key"]] = {
                **e,
                "fileId": str(result.file_id),
                "cdnUrl": result.cdn_url,
                "thumbFileId": str(thumb.file_id),
                "thumbUrl": thumb.cdn_url,
                "width": width,
                "height": height,
            }
            out.write_text(json.dumps(list(done.values()), indent=1))
            print(f"{e['key']}  {result.file_id}  {result.cdn_url}")
    keep = {e["key"] for e in sourced}
    out.write_text(json.dumps([v for k, v in done.items() if k in keep], indent=1))
    return 0


if __name__ == "__main__":
    from dotenv import load_dotenv

    load_dotenv(Path.cwd() / ".env")
    raise SystemExit(asyncio.run(main()))
