import numpy as np
import time
import random


class ReferenceSimulator:
    """NTP, baz istasyonu ve barometre referans kaynak simülatörü."""

    # İstanbul'da sabit baz istasyonu
    CELL_TOWER_LAT = 41.0150
    CELL_TOWER_LON = 28.9700

    def __init__(self, start_alt: float = 50.0):
        self._baro_alt = start_alt
        self._tick = 0

    def tick(self) -> None:
        self._tick += 1
        self._baro_alt += np.random.normal(0, 0.1)

    def get_state(self) -> dict:
        ntp_offset_ms = float(random.gauss(0, 2))  # ±2ms normal
        ntp_timestamp = time.time() + ntp_offset_ms / 1000.0

        # Baz istasyonuna mesafe (sabit + küçük gürültü)
        cell_distance = float(np.random.normal(850, 10))  # ~850m mesafe

        return {
            "ntp_timestamp": ntp_timestamp,
            "ntp_offset_ms": ntp_offset_ms,
            "cell_tower_lat": self.CELL_TOWER_LAT,
            "cell_tower_lon": self.CELL_TOWER_LON,
            "cell_tower_distance_m": cell_distance,
            "barometric_altitude_m": self._baro_alt,
        }
