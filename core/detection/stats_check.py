import numpy as np
from collections import deque
from dataclasses import dataclass, field
from typing import List


@dataclass
class StatsResult:
    passed: bool
    score: float
    violations: List[str] = field(default_factory=list)


class StatisticsChecker:
    """
    İstatistiksel analiz motoru.
    Rolling window (son 20 tick) ile anomali tespiti.
    """

    WINDOW_SIZE = 20
    SNR_ZSCORE_THRESHOLD = 3.0
    DOPPLER_VELOCITY_DIFF_MS = 5.0  # m/s
    GDOP_BAD = 6.0
    L1_WAVELENGTH = 0.1903          # L1 GPS dalga boyu (metre)
    CHI2_P_THRESHOLD = 0.05

    def __init__(self):
        self._window: deque = deque(maxlen=self.WINDOW_SIZE)

    def add_snapshot(self, snapshot: dict) -> None:
        self._window.append(snapshot)

    def check_all(self, snapshot: dict) -> StatsResult:
        self.add_snapshot(snapshot)

        if len(self._window) < 5:
            return StatsResult(passed=True, score=1.0)

        violations = []
        scores = []
        gnss = snapshot["gnss"]

        # Analiz 1: SNR varyans Z-score
        snr_means = [s["gnss"]["snr_mean"] for s in self._window]
        if len(snr_means) >= 3:
            mean_snr = np.mean(snr_means[:-1])
            std_snr = np.std(snr_means[:-1])
            if std_snr > 0:
                z = abs(snr_means[-1] - mean_snr) / std_snr
                if z > self.SNR_ZSCORE_THRESHOLD:
                    violations.append(f"SNR Z-score: {z:.2f} (>{self.SNR_ZSCORE_THRESHOLD}σ)")
                    scores.append(max(0.0, 1.0 - (z - self.SNR_ZSCORE_THRESHOLD) / 5.0))
                else:
                    scores.append(1.0)
            else:
                scores.append(1.0)
        else:
            scores.append(1.0)

        # Analiz 2: Doppler-Hız tutarsızlığı
        doppler_velocity = abs(gnss["doppler_shift_hz"]) * self.L1_WAVELENGTH
        imu_speed_ms = snapshot["imu"]["speed_ms"]
        doppler_diff = abs(doppler_velocity - imu_speed_ms)
        if doppler_diff > self.DOPPLER_VELOCITY_DIFF_MS:
            violations.append(f"Doppler-hız farkı: {doppler_diff:.2f} m/s (>{self.DOPPLER_VELOCITY_DIFF_MS})")
            scores.append(max(0.0, 1.0 - (doppler_diff - self.DOPPLER_VELOCITY_DIFF_MS) / 20.0))
        else:
            scores.append(1.0)

        # Analiz 3: GDOP bozulması
        if gnss["gdop"] > self.GDOP_BAD:
            violations.append(f"GDOP: {gnss['gdop']:.2f} (>{self.GDOP_BAD})")
            scores.append(max(0.0, 1.0 - (gnss["gdop"] - self.GDOP_BAD) / 10.0))
        else:
            scores.append(1.0)

        # Analiz 4: Pseudorange chi-square (basit varyans kontrolü)
        residual_std = gnss["pseudorange_residual_std"]
        if residual_std > 3.0:  # normal: ~0.5
            violations.append(f"Pseudorange residual std: {residual_std:.2f} (>3.0)")
            scores.append(max(0.0, 1.0 - residual_std / 10.0))
        else:
            scores.append(1.0)

        # Analiz 5: Konum varyans (sistematik kayma)
        if len(self._window) >= 10:
            lats = [s["gnss"]["latitude"] for s in self._window]
            ticks = list(range(len(lats)))
            if len(lats) > 2:
                coeffs = np.polyfit(ticks, lats, 1)
                slope = abs(coeffs[0])
                # Normal drift ~0.00001 deg/tick, spoofing ~0.0001+
                if slope > 0.00005:
                    violations.append(f"Sistematik konum kayması: {slope:.6f} deg/tick")
                    scores.append(max(0.0, 1.0 - slope / 0.001))
                else:
                    scores.append(1.0)
            else:
                scores.append(1.0)
        else:
            scores.append(1.0)

        avg_score = sum(scores) / len(scores) if scores else 1.0
        return StatsResult(
            passed=len(violations) == 0,
            score=avg_score,
            violations=violations,
        )
