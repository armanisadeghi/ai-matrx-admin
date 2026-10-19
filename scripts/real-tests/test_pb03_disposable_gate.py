"""PB-03's disposable gate refuses a shared agent, a drifted setting, a changed definition and the wrong organization,
and passes an agent that holds exactly the sealed block (offline: a fake reader stands in for the database).

Run: python3 -m pytest scripts/real-tests/test_pb03_disposable_gate.py
Break named: gate waved through (check_disposable returning []) -- every refusal test below fails.
"""
import copy
import subprocess
import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import fixture_check as fc  # noqa: E402
import pb03_gate as g  # noqa: E402

SRC = {"id": "src", "model_id": "m1", "variable_definitions": [{"n": 1}], "messages": [{"t": "Held by settings desk"}],
       "context_policies": None, "prompt_blocks": [], "output_schema": None, "skill_config": None, "model_tiers": None,
       "custom_tools": [], "tool_config": {}, "mcp_servers": [], "tools": ["t1", "t2"], "organization_id": g.SAFETY_NET_ORG,
       "deleted_at": None, "is_archived": False, "is_active": True, "settings": {"reasoning_effort": "low"}}


class Fake:
    def __init__(self, disposable):
        self.d = disposable

    def rows(self, schema, table, q):
        return [self.d] if q["id"] == "eq.disp" else []

    def one(self, schema, table, id_, select):
        return SRC

    def tools(self, ids):
        return {"t1": {"name": "agent"}, "t2": {"name": "send_message"}}


def disp(**over):
    d = copy.deepcopy(SRC) | {"id": "disp", "settings": copy.deepcopy(g.SEALED_SETTINGS)}
    d.update(over)
    return d


def run(d, agent="disp"):
    return g.check_disposable(Fake(d), "A", agent)


def test_exact_copy_passes():
    assert run(disp()) == []


def test_shared_settings_desk_is_refused():
    out = g.check_disposable(Fake(disp()), "A", "dc479b11-c274-4d80-b4ae-3f8db31f9721")
    assert out and "shared live fixture agent" in out[0]


def test_settings_drift_is_refused_and_every_key_named():
    s = copy.deepcopy(g.SEALED_SETTINGS); s["reasoning_effort"] = "low"; s["seed"] = 1; del s["top_k"]; s["extra"] = 1
    out = run(disp(settings=s))
    for k in ("reasoning_effort", "seed", "top_k", "extra"):
        assert any(f"settings.{k}" in x for x in out), k


def test_definition_changes_are_refused():
    for field, val in (("model_id", "m2"), ("variable_definitions", []), ("messages", []), ("tool_config", {"x": 1}), ("tools", ["t1"])):
        assert run(disp(**{field: val})), field


def test_wrong_organization_and_archived_are_refused():
    assert run(disp(organization_id="other"))
    assert run(disp(is_archived=True))


def test_pb03_send_requires_agent_and_runs_the_gate_before_any_send():
    src = (HERE / "pb03-send.py").read_text()
    assert "REFUSED: no --agent" in src
    assert src.index("diffs, accepted = gate_counted(reader,") < src.index("send(token, path, body)")


# ---- grader plant record (PB-03 blind fault proof): accepts exactly the planted difference, silently
import pytest  # noqa: E402


@pytest.fixture
def grader(tmp_path, monkeypatch):
    monkeypatch.setattr(fc, "GRADER_DIR", tmp_path)
    return tmp_path


def planted(**over):
    s = copy.deepcopy(g.SEALED_SETTINGS); s["tool_choice"] = "none"; s.update(over)
    return disp(settings=s)


def test_plant_record_matching_diff_passes_silently(grader):
    g.write_plant_record("disp", "tool_choice", "none")
    out, n = g.check_disposable_counted(Fake(planted()), "A", "disp")
    assert out == [] and n == 1
    assert g.gate(Fake(planted()), {"A": "disp"}) == []


def test_plant_record_other_value_is_refused(grader):
    g.write_plant_record("disp", "tool_choice", "none")
    out = run(planted(tool_choice="required"))
    assert any("settings.tool_choice" in x for x in out)


def test_plant_record_other_key_is_refused(grader):
    g.write_plant_record("disp", "tool_choice", "none")
    out = run(planted(seed=1))
    assert any("settings.seed" in x for x in out) and not any("settings.tool_choice" in x for x in out)


def test_plant_record_for_another_agent_or_expired_is_refused(grader):
    from datetime import datetime, timedelta, timezone
    g.write_plant_record("someone-else", "tool_choice", "none")
    assert run(planted())
    g.write_plant_record("disp", "tool_choice", "none")
    later = datetime.now(timezone.utc) + timedelta(hours=3)
    assert g.check_disposable(Fake(planted()), "A", "disp", now=later)


def test_no_record_is_refused(grader):
    assert any("settings.tool_choice" in x for x in run(planted()))


def test_record_never_accepts_non_settings_difference(grader):
    g.write_plant_record("disp", "tool_choice", "none")
    assert run(planted(model_id="m2"))


def test_send_output_does_not_name_planted_key():
    src = (HERE / "pb03-send.py").read_text()
    assert "difference(s) accepted" in src and "tool_choice" not in src.split("disposable gate: PASS")[1][:200]
