from collections import deque
from red_team.base_attack import BaseAttack


class MeaconingAttack(BaseAttack):
    """
    Meaconing saldırısı: eski GNSS sinyalini geciktirerek tekrar yayınlar.
    Zaman damgasını da geciktirir → NTP tutarsızlığı üretir.
    """
    name = "MEACONING"
    severity = "HIGH"

    def __init__(self, delay_ticks: int = 10):
        super().__init__()
        self.delay_ticks = int(max(3, min(delay_ticks, 20)))
        self._delay_buffer: deque = deque(maxlen=self.delay_ticks + 1)

    def _on_activate(self, params: dict) -> None:
        self.delay_ticks = int(max(3, min(params.get("delay_ticks", self.delay_ticks), 20)))
        self._delay_buffer = deque(maxlen=self.delay_ticks + 1)

    def _on_deactivate(self) -> None:
        self._delay_buffer.clear()

    def apply(self, gnss_data: dict, tick: int) -> dict:
        import copy
        # Mevcut veriyi buffer'a ekle
        self._delay_buffer.append(copy.deepcopy(gnss_data))

        # Buffer dolmadıysa normal veriyi döndür
        if len(self._delay_buffer) <= self.delay_ticks:
            return gnss_data

        # delay_ticks önceki veriyi döndür
        delayed_data = dict(self._delay_buffer[0])

        # Gecikme farkı: saniye cinsinden (her tick 0.5s)
        delay_seconds = self.delay_ticks * 0.5
        delayed_data["timestamp_gnss"] = int(delayed_data["timestamp_gnss"] - delay_seconds * 1_000_000_000)

        return delayed_data

    def get_metadata(self) -> dict:
        return {
            "name": self.name,
            "severity": self.severity,
            "delay_ticks": self.delay_ticks,
            "delay_seconds": self.delay_ticks * 0.5,
            "buffer_size": len(self._delay_buffer),
            "is_active": self.is_active,
        }
