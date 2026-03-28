import numpy as np
from red_team.base_attack import BaseAttack


class JammingAttack(BaseAttack):
    """
    Jamming saldırısı: SNR kademeli düşürür, uydu kaybettirir, GDOP bozar.
    IMU ve referans verisine dokunmaz.
    """
    name = "JAMMING"
    severity = "HIGH"

    def __init__(self, intensity: float = 1.0, ramp_up_ticks: int = 10):
        super().__init__()
        self.intensity = float(np.clip(intensity, 0.0, 1.0))
        self.ramp_up_ticks = ramp_up_ticks

    def _on_activate(self, params: dict) -> None:
        self.intensity = float(np.clip(params.get("intensity", self.intensity), 0.0, 1.0))
        self.ramp_up_ticks = int(params.get("ramp_up_ticks", self.ramp_up_ticks))

    def apply(self, gnss_data: dict, tick: int) -> dict:
        data = dict(gnss_data)
        elapsed = tick - self.start_tick

        # Kademeli yoğunlaşma
        ramp = min(1.0, elapsed / max(self.ramp_up_ticks, 1))
        effective_intensity = ramp * self.intensity

        # SNR kademeli düşür
        snr_drop = effective_intensity * 2.5 * elapsed
        data["snr_db"] = [max(5.0, s - snr_drop + np.random.normal(0, 1)) for s in data["snr_db"]]
        data["snr_mean"] = float(np.mean(data["snr_db"]))
        data["snr_std"] = float(np.std(data["snr_db"]) * (1 + effective_intensity))
        data["snr_min"] = float(np.min(data["snr_db"]))

        # Her 3 tick'te 1 uydu kaybet
        lost_satellites = min(data["satellite_count"] - 1, elapsed // 3)
        data["satellite_count"] = max(1, data["satellite_count"] - int(lost_satellites * effective_intensity))

        # GDOP boz
        data["gdop"] = float(data["gdop"] + effective_intensity * elapsed * 0.3)
        data["pdop"] = float(data["pdop"] + effective_intensity * elapsed * 0.25)

        # Doppler gürültü
        data["doppler_shift_hz"] = float(data["doppler_shift_hz"] + np.random.normal(0, 50 * effective_intensity))

        return data

    def get_metadata(self) -> dict:
        return {
            "name": self.name,
            "severity": self.severity,
            "intensity": self.intensity,
            "ramp_up_ticks": self.ramp_up_ticks,
            "is_active": self.is_active,
        }
