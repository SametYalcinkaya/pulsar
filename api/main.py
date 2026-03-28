import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from simulation.coordinator import SimulationCoordinator
from red_team.attack_manager import AttackManager
from core.clv_engine import CLVEngine
from core.xai.xai_coordinator import XAICoordinator
from core.detection.ml_detector import MLDetector
from evidence.evidence_builder import EvidenceBuilder
from api.websocket_handler import manager, websocket_endpoint
from api.background import TickLoop
from api.schemas import AttackCommand

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# Global nesneler
_coordinator = SimulationCoordinator()
_attack_manager = AttackManager()
_ml_detector = MLDetector()
_xai_coordinator = XAICoordinator(_ml_detector)
_clv_engine = CLVEngine(_xai_coordinator)
_tick_loop: Optional[TickLoop] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _tick_loop
    _tick_loop = TickLoop(_coordinator, _attack_manager, _clv_engine, manager)
    _tick_loop.start()
    logger.info("PULSAR başlatıldı.")
    yield
    _tick_loop.stop()
    logger.info("PULSAR durduruldu.")


app = FastAPI(title="PULSAR API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── WebSocket ────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def ws_route(websocket: WebSocket):
    await websocket_endpoint(websocket)


# ── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "ws_clients": manager.count,
        "tick": _coordinator._tick,
    }


# ── Saldırı endpointleri ─────────────────────────────────────────────────────

@app.post("/api/attack/start")
async def attack_start(cmd: AttackCommand):
    ok = _attack_manager.activate(
        cmd.attack_name,
        cmd.params or {},
        tick=_coordinator._tick,
    )
    if not ok:
        raise HTTPException(status_code=400, detail=f"Bilinmeyen saldırı: {cmd.attack_name}")
    return {"status": "started", "attack": cmd.attack_name.upper()}


@app.post("/api/attack/stop")
async def attack_stop(cmd: AttackCommand):
    _attack_manager.deactivate(cmd.attack_name)
    return {"status": "stopped", "attack": cmd.attack_name.upper()}


@app.get("/api/attack/status")
async def attack_status():
    return {
        "active": _attack_manager.get_active_attacks(),
        "label": _attack_manager.get_active_label(),
        "details": _attack_manager.get_status(),
    }


# ── Delil endpointleri ────────────────────────────────────────────────────────

@app.get("/api/evidence")
async def list_evidence():
    packages = EvidenceBuilder.load_all()
    return {"count": len(packages), "items": packages}


@app.get("/api/evidence/{evidence_id}")
async def get_evidence(evidence_id: str):
    packages = EvidenceBuilder.load_all()
    for p in packages:
        if p.get("evidence_id") == evidence_id:
            return p
    raise HTTPException(status_code=404, detail="Delil paketi bulunamadı")


@app.get("/api/explain/{evidence_id}")
async def explain_evidence(evidence_id: str):
    packages = EvidenceBuilder.load_all()
    for p in packages:
        if p.get("evidence_id") == evidence_id:
            return {
                "evidence_id": evidence_id,
                "human_readable": p.get("human_readable_explanation"),
                "shap_top_features": p.get("shap_top_features", []),
                "physics_violations": p.get("physics_violations", []),
                "stats_violations": p.get("stats_violations", []),
            }
    raise HTTPException(status_code=404, detail="Delil paketi bulunamadı")


# ── Geçmiş ve istatistikler ───────────────────────────────────────────────────

@app.get("/api/history")
async def get_history(limit: int = 100):
    if _tick_loop is None:
        return {"items": []}
    return {"items": _tick_loop.get_history(limit)}


@app.get("/api/stats")
async def get_stats():
    packages = EvidenceBuilder.load_all()
    attack_counts: dict = {}
    for p in packages:
        at = p.get("attack_type", "UNKNOWN")
        attack_counts[at] = attack_counts.get(at, 0) + 1

    return {
        "total_evidence": len(packages),
        "attack_type_counts": attack_counts,
        "current_tick": _coordinator._tick,
        "ws_clients": manager.count,
    }


@app.post("/api/reset")
async def reset():
    if _tick_loop:
        _tick_loop.reset()
    return {"status": "reset"}
