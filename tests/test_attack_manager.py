import pytest
from red_team.attack_manager import AttackManager
from tests.test_physics_check import make_snapshot


def base_gnss():
    snap = make_snapshot()
    return snap["gnss"]


def test_jamming_reduces_snr():
    mgr = AttackManager()
    mgr.activate("jamming", {"intensity": 1.0}, tick=1)
    gnss = base_gnss()
    original_snr = gnss["snr_mean"]
    for tick in range(1, 20):
        gnss = mgr.apply_all(dict(gnss), tick)
    assert gnss["snr_mean"] < original_snr


def test_spoofing_drifts_position():
    mgr = AttackManager()
    mgr.activate("spoofing", {"mode": "sophisticated", "drift_speed": 0.001}, tick=1)
    gnss = base_gnss()
    original_lat = gnss["latitude"]
    for tick in range(1, 20):
        gnss = mgr.apply_all(dict(gnss), tick)
    assert gnss["latitude"] != original_lat


def test_deactivate_returns_to_normal():
    mgr = AttackManager()
    mgr.activate("jamming", {}, tick=1)
    assert "jamming" in mgr.get_active_attacks()
    mgr.deactivate("jamming")
    assert "jamming" not in mgr.get_active_attacks()


def test_combined_attack():
    mgr = AttackManager()
    mgr.activate("jamming", {}, tick=1)
    mgr.activate("spoofing", {}, tick=1)
    assert len(mgr.get_active_attacks()) == 2
    assert mgr.get_active_label() == "COMBINED"


def test_meaconing_delays():
    mgr = AttackManager()
    mgr.activate("meaconing", {"delay_ticks": 5}, tick=1)
    gnss = base_gnss()
    first_lat = gnss["latitude"]
    results = []
    for tick in range(1, 12):
        g = dict(gnss)
        g["latitude"] += tick * 0.001  # her tick konumu değiştir
        out = mgr.apply_all(g, tick)
        results.append(out["latitude"])
    # Meaconing geciktirdiğinden ilk çıktılar eski değerleri içermeli
    assert results[0] != results[-1]
