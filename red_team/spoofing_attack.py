import numpy as np
from red_team.base_attack import BaseAttack


class SpoofingAttack(BaseAttack):
    """
    Spoofing saldırısı: GNSS konumunu manipüle eder.
    Sofistike mod: yavaş kayma, SNR normal kalır (klasik tespiti atlatır).
    Agresif mod: anlık büyük sıçrama + zaman kaydırma.
    """
    name = "SPOOFING"
    severity = "CRITICAL"

    def __init__(self, mode: str = "sophisticated", drift_speed: float = 0.0001,
                 target_lat: float = None, target_lon: float = None):
        super().__init__()
        self.mode = mode  # "sophisticated" | "aggressive"
        self.drift_speed = drift_speed
        self.target_lat = target_lat
        self.target_lon = target_lon
        self._cumulative_drift_lat = 0.0
        self._cumulative_drift_lon = 0.0

    def _on_activate(self, params: dict) -> None:
        self.mode = params.get("mode", self.mode)
        self.drift_speed = float(params.get("drift_speed", self.drift_speed))
        self.target_lat = params.get("target_lat", self.target_lat)
        self.target_lon = params.get("target_lon", self.target_lon)
        self._cumulative_drift_lat = 0.0
        self._cumulative_drift_lon = 0.0

    def _on_deactivate(self) -> None:
        self._cumulative_drift_lat = 0.0
        self._cumulative_drift_lon = 0.0

    def apply(self, gnss_data: dict, tick: int) -> dict:
        data = dict(gnss_data)

        if self.mode == "sophisticated":
            # Konum çok yavaş kuzey-doğuya kayar
            self._cumulative_drift_lat += self.drift_speed
            self._cumulative_drift_lon += self.drift_speed
            data["latitude"] = data["latitude"] + self._cumulative_drift_lat
            data["longitude"] = data["longitude"] + self._cumulative_drift_lon
            # SNR NORMAL kalır — klasik SNR tespiti başarısız olur
            # Pseudorange residuals hafif bozulur
            data["pseudorange_residuals"] = [r + np.random.normal(0, 1.5) for r in data["pseudorange_residuals"]]
            data["pseudorange_residual_std"] = float(np.std(data["pseudorange_residuals"]))

        elif self.mode == "aggressive":
            # Anlık büyük sıçrama
            jump_lat = np.random.uniform(0.01, 0.05)
            jump_lon = np.random.uniform(0.01, 0.05)
            data["latitude"] = data["latitude"] + jump_lat
            data["longitude"] = data["longitude"] + jump_lon
            # Zaman kaydırma
            data["timestamp_gnss"] = int(data["timestamp_gnss"] - 3_000_000_000)  # 3 saniye geri
            # SNR hafif bozulur
            data["snr_db"] = [s + np.random.normal(0, 3) for s in data["snr_db"]]
            data["snr_mean"] = float(np.mean(data["snr_db"]))
            data["snr_std"] = float(np.std(data["snr_db"]))
            data["snr_min"] = float(np.min(data["snr_db"]))

        return data

    def get_metadata(self) -> dict:
        return {
            "name": self.name,
            "severity": self.severity,
            "mode": self.mode,
            "drift_speed": self.drift_speed,
            "cumulative_drift_lat": self._cumulative_drift_lat,
            "cumulative_drift_lon": self._cumulative_drift_lon,
            "is_active": self.is_active,
        }
