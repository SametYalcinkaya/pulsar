import time
from typing import Optional
from simulation.gnss_sim import GNSSSimulator
from simulation.imu_sim import IMUSimulator
from simulation.reference_sim import ReferenceSimulator


TICK_INTERVAL_MS = 500


class SimulationCoordinator:
    """3 simülatörü senkron çalıştırır ve tam snapshot üretir."""

    def __init__(self):
        self.gnss = GNSSSimulator()
        self.imu = IMUSimulator()
        self.reference = ReferenceSimulator()
        self._tick = 0
        self._attack_hook = None  # AttackManager inject edilir
        self._active_attack: Optional[str] = None

    def set_attack_hook(self, hook) -> None:
        self._attack_hook = hook

    def set_active_attack_label(self, label: Optional[str]) -> None:
        self._active_attack = label

    def step(self) -> dict:
        """Bir tick ilerlet ve snapshot döndür."""
        self._tick += 1
        self.gnss.tick()
        self.imu.tick()
        self.reference.tick()
        return self.get_full_snapshot()

    def get_full_snapshot(self) -> dict:
        gnss_data = self.gnss.get_state()
        imu_data = self.imu.get_state()
        ref_data = self.reference.get_state()
        dr_pos = self.imu.get_dead_reckoning_position()

        # Saldırı varsa GNSS verisine uygula
        if self._attack_hook:
            gnss_data = self._attack_hook(gnss_data, self._tick)

        return {
            "tick": self._tick,
            "timestamp": time.time(),
            "gnss": gnss_data,
            "imu": {**imu_data, "dead_reckoning": dr_pos},
            "reference": ref_data,
            "attack_active": self._active_attack,
        }

    def inject_attack(self, attack_type: str, params: dict) -> None:
        """Saldırı enjeksiyon hook'u — AttackManager tarafından kullanılır."""
        self._active_attack = attack_type

    def reset(self) -> None:
        self.__init__()
