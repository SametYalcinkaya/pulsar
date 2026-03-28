import pytest
from core.trust_score import TrustScoreEngine


def test_all_high_scores_safe():
    engine = TrustScoreEngine()
    result = engine.calculate(1.0, 1.0, 1.0)
    assert result["trust_score"] >= 95
    assert result["threat_level"] == "SAFE"
    assert result["attack_type"] is None


def test_physics_fail_low_trust():
    engine = TrustScoreEngine()
    result = engine.calculate(0.0, 1.0, 1.0)
    # 0.40*0 + 0.35*1 + 0.25*1 = 0.60 → 60
    assert result["trust_score"] == pytest.approx(60.0, abs=1)
    assert result["threat_level"] == "WARNING"


def test_all_fail_critical():
    engine = TrustScoreEngine()
    result = engine.calculate(0.0, 0.0, 0.0)
    assert result["trust_score"] == 0.0
    assert result["threat_level"] == "CRITICAL"


def test_threat_levels():
    engine = TrustScoreEngine()
    assert engine.calculate(0.8, 0.8, 0.8)["threat_level"] == "SAFE"
    assert engine.calculate(0.5, 0.5, 0.5)["threat_level"] == "WARNING"
    assert engine.calculate(0.3, 0.3, 0.3)["threat_level"] == "THREAT"
    assert engine.calculate(0.1, 0.1, 0.1)["threat_level"] == "CRITICAL"
