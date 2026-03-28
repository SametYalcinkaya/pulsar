import asyncio
import logging
import time
from collections import deque
from typing import Optional

logger = logging.getLogger(__name__)

TICK_INTERVAL_S = 0.5
HISTORY_MAX = 200


class TickLoop:
    """
    Arka planda her 500ms'de bir tick atar.
    Snapshot alır → CLV analizi yapar → tüm WS client'larına push eder.
    """

    def __init__(self, coordinator, attack_manager, clv_engine, ws_manager):
        self._coordinator = coordinator
        self._attack_manager = attack_manager
        self._clv = clv_engine
        self._ws = ws_manager
        self._history: deque = deque(maxlen=HISTORY_MAX)
        self._running = False
        self._task: Optional[asyncio.Task] = None

    def start(self) -> None:
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._loop())
            logger.info("Tick döngüsü başlatıldı.")

    def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()

    async def _loop(self) -> None:
        while self._running:
            t_start = time.perf_counter()
            try:
                await self._tick()
            except Exception as e:
                logger.error(f"Tick hatası: {e}", exc_info=True)
            elapsed = time.perf_counter() - t_start
            sleep_time = max(0.0, TICK_INTERVAL_S - elapsed)
            await asyncio.sleep(sleep_time)

    async def _tick(self) -> None:
        # Saldırı hook'unu bağla
        self._coordinator.set_attack_hook(
            lambda gnss, tick: self._attack_manager.apply_all(gnss, tick)
        )
        self._coordinator.set_active_attack_label(self._attack_manager.get_active_label())

        # Snapshot al
        snapshot = self._coordinator.step()

        # CLV analizi
        result = await asyncio.get_event_loop().run_in_executor(
            None, self._clv.analyze, snapshot
        )

        # Payload oluştur
        payload = {
            "type": "tick",
            "tick": result.tick,
            "trust_score": result.trust_score,
            "threat_level": result.threat_level,
            "attack_type": result.attack_type,
            "gnss": snapshot["gnss"],
            "imu": snapshot["imu"],
            "reference": snapshot["reference"],
            "physics_result": result.physics_result,
            "stats_result": result.stats_result,
            "ml_result": result.ml_result,
            "xai_summary": result.xai_result.get("summary") if result.xai_result else None,
            "xai_evidence_id": result.xai_result.get("evidence_id") if result.xai_result else None,
            "active_attack": snapshot.get("attack_active"),
            "timings_ms": result.timings_ms,
        }

        self._history.append(payload)

        # WS broadcast
        await self._ws.broadcast(payload)

    def get_history(self, limit: int = 100) -> list:
        items = list(self._history)
        return items[-limit:] if limit else items

    def reset(self) -> None:
        self._history.clear()
        self._coordinator.reset()
        self._attack_manager.deactivate_all()
