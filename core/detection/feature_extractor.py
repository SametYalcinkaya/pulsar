import numpy as np
import math
from collections import deque
from typing import List


FEATURE_NAMES = [
    "snr_mean", "snr_std", "snr_min",
    "satellite_count", "gdop", "pdop",
    "position_discrepancy_m", "doppler_velocity_diff",
    "ntp_offset_ms", "position_variance",
    "imu_heading_gnss_heading_diff",
    "pseudorange_residual_std",
    "barometric_altitude_diff", "speed_kmh",
    "satellite_count_delta",
]


def _haversine_m(lat1, lon1, lat2, lon2) -> float:
    R = 6_371_000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class FeatureExtractor:
    """15 özellikli vektör çıkarımı. MinMaxScaler ile normalizasyon."""

    L1_WAVELENGTH = 0.1903
    WINDOW = 20

    def __init__(self):
        self._lat_history: deque = deque(maxlen=self.WINDOW)
        self._sat_history: deque = deque(maxlen=5)
        # Min-max aralıkları (elle ayarlanmış)
        self._feature_min = np.array([5, 0, 5, 1, 1, 1, 0, 0, -100, 0, 0, 0, 0, 0, -10], dtype=float)
        self._feature_max = np.array([50, 15, 50, 20, 20, 15, 500, 50, 5000, 1e-6, 360, 10, 200, 400, 10], dtype=float)

    def extract(self, snapshot: dict, window_data: list = None) -> np.ndarray:
        gnss = snapshot["gnss"]
        imu = snapshot["imu"]
        ref = snapshot["reference"]

        self._lat_history.append(gnss["latitude"])
        self._sat_history.append(gnss["satellite_count"])

        # Konum-IMU farkı
        dr = imu["dead_reckoning"]
        pos_discrepancy = _haversine_m(
            gnss["latitude"], gnss["longitude"],
            dr["latitude"], dr["longitude"]
        )

        # Doppler-hız farkı
        doppler_vel = abs(gnss["doppler_shift_hz"]) * self.L1_WAVELENGTH
        doppler_diff = abs(doppler_vel - imu["speed_ms"])

        # NTP farkı (ms)
        gnss_time_s = gnss["timestamp_gnss"] / 1e9
        ntp_diff_ms = abs(gnss_time_s - ref["ntp_timestamp"]) * 1000

        # Konum varyansı
        if len(self._lat_history) >= 3:
            pos_var = float(np.var(list(self._lat_history)))
        else:
            pos_var = 0.0

        # IMU heading vs GNSS heading farkı (basit: IMU heading mevcut)
        heading_diff = abs(imu["heading_deg"] - 0.0) % 360  # GNSS heading yok, IMU'yu kullan
        heading_diff = min(heading_diff, 360 - heading_diff)

        # Barometrik fark
        baro_diff = abs(gnss["altitude"] - ref["barometric_altitude_m"])

        # Uydu sayısı delta
        if len(self._sat_history) >= 2:
            sat_delta = float(self._sat_history[0] - self._sat_history[-1])
        else:
            sat_delta = 0.0

        features = np.array([
            gnss["snr_mean"],
            gnss["snr_std"],
            gnss["snr_min"],
            float(gnss["satellite_count"]),
            gnss["gdop"],
            gnss["pdop"],
            pos_discrepancy,
            doppler_diff,
            ntp_diff_ms,
            pos_var,
            heading_diff,
            gnss["pseudorange_residual_std"],
            baro_diff,
            imu["speed_kmh"],
            sat_delta,
        ], dtype=float)

        # Güvenli default (NaN/Inf temizle)
        features = np.nan_to_num(features, nan=0.0, posinf=999.0, neginf=-999.0)

        # MinMax normalizasyon
        denom = self._feature_max - self._feature_min
        denom[denom == 0] = 1.0
        features_norm = np.clip((features - self._feature_min) / denom, 0.0, 1.0)

        return features_norm
