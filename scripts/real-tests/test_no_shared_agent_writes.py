"""A grader script never writes settings on a shared live agent (Arman's ruling 2026-10-19).

Run: python3 -m pytest scripts/real-tests/test_no_shared_agent_writes.py
Break named: plant-pb03 pointed back at Settings Desk O (the old COPY_O) -- the guard must refuse it.
"""
import importlib.util
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, HERE / file)
    mod = importlib.util.module_from_spec(spec)
    import sys
    sys.path.insert(0, str(HERE))
    spec.loader.exec_module(mod)
    return mod


fixture_check = _load("fixture_check", "fixture_check.py")
SETTINGS_DESK = {
    "A": "dc479b11-c274-4d80-b4ae-3f8db31f9721",
    "O": "9f6bf0cd-f555-4c3a-a87c-2a66a6c52453",
    "G": "95e4fec5-b7bb-495e-868a-3b3da74ea2f7",
}


@pytest.mark.parametrize("letter", sorted(SETTINGS_DESK))
def test_settings_desk_agents_are_refused(letter):
    with pytest.raises(SystemExit) as e:
        fixture_check.refuse_shared_agent_write(SETTINGS_DESK[letter])
    assert "shared live fixture agent" in str(e.value)


def test_a_disposable_agent_is_allowed():
    fixture_check.refuse_shared_agent_write("00000000-aaaa-bbbb-cccc-000000000001")


def test_plant_script_writes_through_the_guard():
    src = (HERE / "plant-pb03.py").read_text()
    assert "refuse_shared_agent_write(agent_id)" in src and 'COPIES["O"]' not in src


def test_settings_desk_manifest_stays_low():
    import json
    m = json.loads((HERE / "fixtures.json").read_text())
    for k in ("settings_a", "settings_o", "settings_g"):
        assert m["fixtures"][k]["reasoning_effort"] == "low", k
