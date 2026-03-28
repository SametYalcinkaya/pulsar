import pytest
import os
import json
from evidence.evidence_builder import EvidenceBuilder
from tests.test_physics_check import make_snapshot


@pytest.fixture
def builder(tmp_path, monkeypatch):
    monkeypatch.setattr("evidence.evidence_builder.EVIDENCE_DIR", str(tmp_path / "logs"))
    monkeypatch.setattr("evidence.evidence_builder.KEY_PATH", str(tmp_path / "key.pem"))
    monkeypatch.setattr("evidence.evidence_builder.COUNTER_FILE", str(tmp_path / ".counter"))
    os.makedirs(str(tmp_path / "logs"), exist_ok=True)
    return EvidenceBuilder()


def test_builds_evidence_package(builder):
    snap = make_snapshot()
    trust_data = {"trust_score": 25.0, "threat_level": "THREAT", "attack_type": "SPOOFING"}
    physics = {"passed": False, "score": 0.3, "violations": ["Test ihlali"]}
    stats = {"passed": True, "score": 0.9, "violations": []}
    ml = {"anomaly_score": -0.5}

    pkg = builder.build(
        snapshot=snap,
        trust_data=trust_data,
        physics_result=physics,
        stats_result=stats,
        ml_result=ml,
        xai_data={"summary": "Test özeti", "shap": {"top_features": []}},
    )

    assert "evidence_id" in pkg
    assert pkg["attack_type"] == "SPOOFING"
    assert pkg["trust_score_after"] == 25.0
    assert pkg["raw_data_hash"].startswith("sha256:")
    assert pkg["signature"] != ""


def test_integrity_verification(builder):
    snap = make_snapshot()
    trust_data = {"trust_score": 20.0, "threat_level": "CRITICAL", "attack_type": "JAMMING"}
    physics = {"passed": False, "score": 0.2, "violations": []}
    stats = {"passed": False, "score": 0.3, "violations": []}
    ml = {"anomaly_score": -0.8}

    pkg = builder.build(
        snapshot=snap,
        trust_data=trust_data,
        physics_result=physics,
        stats_result=stats,
        ml_result=ml,
        xai_data=None,
    )

    assert builder.verify_integrity(pkg)


def test_tampered_package_fails_verification(builder):
    snap = make_snapshot()
    trust_data = {"trust_score": 15.0, "threat_level": "CRITICAL", "attack_type": "MEACONING"}
    physics = {"passed": False, "score": 0.1, "violations": []}
    stats = {"passed": False, "score": 0.2, "violations": []}
    ml = {"anomaly_score": -0.9}

    pkg = builder.build(
        snapshot=snap,
        trust_data=trust_data,
        physics_result=physics,
        stats_result=stats,
        ml_result=ml,
        xai_data=None,
    )

    # Hash'i boz
    pkg["raw_data_hash"] = "sha256:tampered"
    assert not builder.verify_integrity(pkg)
