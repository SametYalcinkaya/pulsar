import numpy as np
import time


class GNSSSimulator:
    """GNSS sinyal simülatörü. Saldırıdan etkilenebilir."""

    def __init__(self, start_lat: float = 41.0082, start_lon: float = 28.9784, start_alt: float = 50.0):
        self.lat = start_lat
        self.lon = start_lon
        self.alt = start_alt
        self._tick = 0

    def tick(self) -> None:
        self._tick += 1
        # Normal pozisyon gürültüsü
        self.lat += np.random.normal(0, 0.00001)
        self.lon += np.random.normal(0, 0.00001)
        self.alt += np.random.normal(0, 0.05)

    def get_state(self) -> dict:
        satellite_count = int(np.clip(np.random.normal(11, 1), 9, 14))
        gdop = float(np.clip(np.random.normal(2.2, 0.3), 1.5, 3.0))
        pdop = float(np.clip(gdop * np.random.uniform(0.85, 0.95), 1.2, 2.8))
        hdop = float(np.clip(pdop * np.random.uniform(0.7, 0.9), 1.0, 2.5))

        snr_values = [float(np.clip(np.random.normal(40, 2), 35, 45)) for _ in range(satellite_count)]

        doppler_shift = float(np.random.normal(0, 5))
        pseudorange_residuals = [float(np.random.normal(0, 0.5)) for _ in range(satellite_count)]

        return {
            "latitude": self.lat,
            "longitude": self.lon,
            "altitude": self.alt,
            "snr_db": snr_values,
            "snr_mean": float(np.mean(snr_values)),
            "snr_std": float(np.std(snr_values)),
            "snr_min": float(np.min(snr_values)),
            "satellite_count": satellite_count,
            "gdop": gdop,
            "pdop": pdop,
            "hdop": hdop,
            "doppler_shift_hz": doppler_shift,
            "pseudorange_residuals": pseudorange_residuals,
            "pseudorange_residual_std": float(np.std(pseudorange_residuals)),
            "timestamp_gnss": time.time_ns(),
        }
