import math
from dataclasses import dataclass, field
from typing import List
from collections import deque


@dataclass
class PhysicsResult:
    passed: bool
    score: float          # 0.0 (kötü) → 1.0 (iyi)
    violations: List[str] = field(default_factory=list)


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6_371_000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class PhysicsChecker:
    """Fiziksel tutarlılık kontrolleri. Her tick < 10ms hedeflenir."""

    POSITION_DISCREPANCY_THRESHOLD = 15.0   # metre
    MAX_SPEED_KMH = 300.0
    NTP_SUSPICIOUS_MS = 200.0
    NTP_CRITICAL_MS = 1000.0
    SATELLITE_DROP_WINDOW = 5
    SATELLITE_DROP_COUNT = 4
    BARO_SUSPICIOUS_M = 50.0

    def __init__(self):
        self._prev_gnss_lat: float = None
        self._prev_gnss_lon: float = None
        self._prev_timestamp: float = None
        self._satellite_history: deque = deque(maxlen=self.SATELLITE_DROP_WINDOW)

    def check_all(self, snapshot: dict) -> PhysicsResult:
        violations = []
        scores = []

        gnss = snapshot["gnss"]
        imu = snapshot["imu"]
        ref = snapshot["reference"]

        # Kontrol 1: Konum-IMU tutarlılığı
        dr = imu["dead_reckoning"]
        discrepancy_m = _haversine_m(
            gnss["latitude"], gnss["longitude"],
            dr["latitude"], dr["longitude"]
        )
        if discrepancy_m > self.POSITION_DISCREPANCY_THRESHOLD:
            violations.append(
                f"Konum-IMU farkı {discrepancy_m:.1f}m (eşik: {self.POSITION_DISCREPANCY_THRESHOLD}m)"
            )
            scores.append(max(0.0, 1.0 - (discrepancy_m - self.POSITION_DISCREPANCY_THRESHOLD) / 100.0))
        else:
            scores.append(1.0)

        # Kontrol 2: Fizik izin vermez hız
        if self._prev_gnss_lat is not None and self._prev_timestamp is not None:
            dt = snapshot["timestamp"] - self._prev_timestamp
            if dt > 0:
                dist_m = _haversine_m(self._prev_gnss_lat, self._prev_gnss_lon,
                                      gnss["latitude"], gnss["longitude"])
                speed_kmh = (dist_m / dt) * 3.6
                if speed_kmh > self.MAX_SPEED_KMH:
                    violations.append(
                        f"Fizik dışı hız: {speed_kmh:.1f} km/s (max: {self.MAX_SPEED_KMH})"
                    )
                    scores.append(0.0)
                else:
                    scores.append(1.0)
            else:
                scores.append(1.0)
        else:
            scores.append(1.0)

        # Kontrol 3: Zaman tutarlılığı (GNSS nanosaniye → saniye)
        gnss_time_s = gnss["timestamp_gnss"] / 1e9
        ntp_time_s = ref["ntp_timestamp"]
        time_diff_ms = abs(gnss_time_s - ntp_time_s) * 1000

        if time_diff_ms > self.NTP_CRITICAL_MS:
            violations.append(f"Kritik zaman farkı: {time_diff_ms:.1f}ms (>{self.NTP_CRITICAL_MS}ms)")
            scores.append(0.0)
        elif time_diff_ms > self.NTP_SUSPICIOUS_MS:
            violations.append(f"Şüpheli zaman farkı: {time_diff_ms:.1f}ms (>{self.NTP_SUSPICIOUS_MS}ms)")
            scores.append(0.4)
        else:
            scores.append(1.0)

        # Kontrol 4: Uydu sayısı ani düşüşü
        self._satellite_history.append(gnss["satellite_count"])
        if len(self._satellite_history) >= self.SATELLITE_DROP_WINDOW:
            drop = self._satellite_history[0] - self._satellite_history[-1]
            if drop >= self.SATELLITE_DROP_COUNT:
                violations.append(f"Uydu sayısı {drop} düştü (son {self.SATELLITE_DROP_WINDOW} tick)")
                scores.append(max(0.0, 1.0 - drop / 10.0))
            else:
                scores.append(1.0)
        else:
            scores.append(1.0)

        # Kontrol 5: Barometrik uyuşmazlık
        baro_diff = abs(gnss["altitude"] - ref["barometric_altitude_m"])
        if baro_diff > self.BARO_SUSPICIOUS_M:
            violations.append(f"Barometrik uyuşmazlık: {baro_diff:.1f}m (>{self.BARO_SUSPICIOUS_M}m)")
            scores.append(max(0.0, 1.0 - (baro_diff - self.BARO_SUSPICIOUS_M) / 100.0))
        else:
            scores.append(1.0)

        # Durum güncelle
        self._prev_gnss_lat = gnss["latitude"]
        self._prev_gnss_lon = gnss["longitude"]
        self._prev_timestamp = snapshot["timestamp"]

        avg_score = sum(scores) / len(scores) if scores else 1.0
        return PhysicsResult(
            passed=len(violations) == 0,
            score=avg_score,
            violations=violations,
        )
