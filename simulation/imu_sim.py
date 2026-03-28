import numpy as np
import math


class IMUSimulator:
    """
    IMU sensör simülatörü.
    ÖNEMLI: IMU fiziksel bir sensördür — GNSS saldırılarından ETKİLENMEZ.
    Dead-reckoning pozisyonu bağımsız bir referans noktasıdır.
    """

    DRIFT_RATE = 0.001  # m/s²
    DT = 0.5            # 500ms tick

    def __init__(self, start_lat: float = 41.0082, start_lon: float = 28.9784):
        self.lat = start_lat
        self.lon = start_lon
        self._vel_x = 0.0
        self._vel_y = 0.0
        self._heading_deg = float(np.random.uniform(0, 360))
        self._tick = 0

    def tick(self) -> None:
        self._tick += 1
        # Küçük drift
        self._vel_x += np.random.normal(0, self.DRIFT_RATE * self.DT)
        self._vel_y += np.random.normal(0, self.DRIFT_RATE * self.DT)
        # Pozisyonu güncelle (metre → derece dönüşümü ~111320 m/derece)
        self.lat += self._vel_y * self.DT / 111320
        self.lon += self._vel_x * self.DT / (111320 * math.cos(math.radians(self.lat)))
        # Hafif yön değişimi
        self._heading_deg = (self._heading_deg + np.random.normal(0, 0.1)) % 360

    def get_state(self) -> dict:
        accel_x = float(np.random.normal(0, 0.02))
        accel_y = float(np.random.normal(0, 0.02))
        accel_z = float(np.random.normal(9.81, 0.02))

        gyro_x = float(np.random.normal(0, 0.001))
        gyro_y = float(np.random.normal(0, 0.001))
        gyro_z = float(np.random.normal(0, 0.001))

        speed_ms = float(np.sqrt(self._vel_x**2 + self._vel_y**2))

        return {
            "accel_x": accel_x,
            "accel_y": accel_y,
            "accel_z": accel_z,
            "gyro_x": gyro_x,
            "gyro_y": gyro_y,
            "gyro_z": gyro_z,
            "heading_deg": self._heading_deg,
            "temperature_c": float(np.random.normal(25, 0.5)),
            "speed_ms": speed_ms,
            "speed_kmh": speed_ms * 3.6,
        }

    def get_dead_reckoning_position(self) -> dict:
        """IMU tabanlı konum tahmini — saldırıdan etkilenmez."""
        return {
            "latitude": self.lat,
            "longitude": self.lon,
        }
