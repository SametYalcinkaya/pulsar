import time
import pytest
from core.detection.stats_check import StatisticsChecker
from tests.test_physics_check import make_snapshot


def test_normal_variance_passes():
    checker = StatisticsChecker()
    for _ in range(10):
        snap = make_snapshot()
        result = checker.check_all(snap)
    assert result.passed
    assert result.score >= 0.8


def test_snr_anomaly_detected():
    import random
    checker = StatisticsChecker()
    # 15 normal tick — hafif varyans ekle ki std > 0 olsun
    for i in range(15):
        snap = make_snapshot()
        snap["gnss"]["snr_mean"] = 40.0 + random.gauss(0, 0.5)
        checker.check_all(snap)
    # Ani SNR düşüşü simüle et
    bad_snap = make_snapshot()
    bad_snap["gnss"]["snr_mean"] = 5.0   # çok düşük → z-score dev
    result = checker.check_all(bad_snap)
    assert not result.passed or result.score < 1.0


def test_gdop_violation():
    checker = StatisticsChecker()
    # Warmup (window >= 5 gerekli)
    for _ in range(5):
        checker.check_all(make_snapshot())
    snap = make_snapshot()
    snap["gnss"]["gdop"] = 8.5  # > 6.0
    result = checker.check_all(snap)
    assert not result.passed
    assert any("gdop" in v.lower() for v in result.violations)
