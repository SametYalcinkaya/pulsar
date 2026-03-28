import time
import pytest
from core.detection.physics_check import PhysicsChecker


def make_snapshot(lat=41.0082, lon=28.9784, alt=50.0,
                  dr_lat=41.0082, dr_lon=28.9784,
                  gnss_time_ns=None, ntp_time=None,
                  satellite_count=11, baro_alt=50.0):
    if gnss_time_ns is None:
        gnss_time_ns = int(time.time() * 1e9)
    if ntp_time is None:
        ntp_time = time.time()
    return {
        "tick": 1,
        "timestamp": time.time(),
        "gnss": {
            "latitude": lat,
            "longitude": lon,
            "altitude": alt,
            "snr_db": [40.0] * satellite_count,
            "snr_mean": 40.0,
            "snr_std": 1.0,
            "snr_min": 38.0,
            "satellite_count": satellite_count,
            "gdop": 2.0,
            "pdop": 1.8,
            "doppler_shift_hz": 0.0,
            "pseudorange_residuals": [0.0] * satellite_count,
            "pseudorange_residual_std": 0.5,
            "timestamp_gnss": gnss_time_ns,
        },
        "imu": {
            "accel_x": 0.0, "accel_y": 0.0, "accel_z": 9.81,
            "gyro_x": 0.0, "gyro_y": 0.0, "gyro_z": 0.0,
            "heading_deg": 90.0,
            "temperature_c": 25.0,
            "speed_ms": 0.0,
            "speed_kmh": 0.0,
            "dead_reckoning": {"latitude": dr_lat, "longitude": dr_lon},
        },
        "reference": {
            "ntp_timestamp": ntp_time,
            "ntp_offset_ms": 0.0,
            "cell_tower_lat": 41.015,
            "cell_tower_lon": 28.970,
            "cell_tower_distance_m": 850.0,
            "barometric_altitude_m": baro_alt,
        },
        "attack_active": None,
    }


def test_normal_data_no_violations():
    checker = PhysicsChecker()
    snap = make_snapshot()
    result = checker.check_all(snap)
    assert result.passed
    assert result.score >= 0.8
    assert result.violations == []


def test_speed_violation():
    checker = PhysicsChecker()
    # İlk tick — referans noktası kaydet
    snap1 = make_snapshot(lat=41.0082, lon=28.9784)
    snap1["timestamp"] = time.time() - 0.5
    checker.check_all(snap1)
    # İkinci tick — 500 km uzakta
    snap2 = make_snapshot(lat=41.0082, lon=33.5000)  # ~400+ km
    snap2["timestamp"] = time.time()
    result = checker.check_all(snap2)
    assert not result.passed
    assert any("hız" in v.lower() or "fizik" in v.lower() for v in result.violations)


def test_ntp_critical_violation():
    checker = PhysicsChecker()
    gnss_now = int(time.time() * 1e9)
    ntp_3s_ahead = time.time() + 5.0  # 5 saniye fark → kritik
    snap = make_snapshot(gnss_time_ns=gnss_now, ntp_time=ntp_3s_ahead)
    result = checker.check_all(snap)
    assert not result.passed
    assert any("zaman" in v.lower() or "ntp" in v.lower() for v in result.violations)


def test_satellite_drop_violation():
    checker = PhysicsChecker()
    # 5 tick boyunca uydu sayısını kademeli düşür
    for sat in [13, 12, 11, 10, 9]:
        snap = make_snapshot(satellite_count=sat)
        checker.check_all(snap)
    # Büyük düşüş: 13'ten 4'e
    for sat in [13, 12, 11, 9, 4]:
        snap = make_snapshot(satellite_count=sat)
        result = checker.check_all(snap)
    # Son tick ile ihlal kontrolü
    assert any("uydu" in v.lower() for v in result.violations) or result.score < 1.0


def test_barometric_mismatch():
    checker = PhysicsChecker()
    snap = make_snapshot(alt=200.0, baro_alt=50.0)  # 150m fark
    result = checker.check_all(snap)
    assert not result.passed
    assert any("baromet" in v.lower() for v in result.violations)
