import json
import hashlib
import os
import time
from datetime import datetime, timezone
from typing import Optional

try:
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa, padding
    from cryptography.hazmat.backends import default_backend
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False

EVIDENCE_DIR = os.path.join(os.path.dirname(__file__), "logs")
KEY_PATH = os.path.join(os.path.dirname(__file__), "demo_private_key.pem")
COUNTER_FILE = os.path.join(os.path.dirname(__file__), ".counter")


def _get_next_id() -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m%d")
    counter = 1
    if os.path.exists(COUNTER_FILE):
        try:
            with open(COUNTER_FILE, "r") as f:
                data = json.load(f)
                if data.get("date") == today:
                    counter = data.get("counter", 0) + 1
        except Exception:
            pass
    with open(COUNTER_FILE, "w") as f:
        json.dump({"date": today, "counter": counter}, f)
    return f"EVD-{today}-{counter:03d}"


def _ensure_key() -> Optional[object]:
    if not CRYPTO_AVAILABLE:
        return None
    if os.path.exists(KEY_PATH):
        try:
            with open(KEY_PATH, "rb") as f:
                return serialization.load_pem_private_key(f.read(), password=None)
        except Exception:
            pass
    # Demo key üret
    key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend(),
    )
    with open(KEY_PATH, "wb") as f:
        f.write(key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ))
    return key


class EvidenceBuilder:
    """
    Alarm tetiklendiğinde imzalı, hash'li hukuki delil paketi üretir.
    """

    def __init__(self):
        os.makedirs(EVIDENCE_DIR, exist_ok=True)
        self._private_key = _ensure_key()
        self._last_trust_score: float = 100.0

    def build(
        self,
        snapshot: dict,
        trust_data: dict,
        physics_result: dict,
        stats_result: dict,
        ml_result: dict,
        xai_data: dict,
        attack_started_at: float = None,
    ) -> dict:
        evidence_id = _get_next_id()
        ts = datetime.now(timezone.utc).isoformat()

        duration = time.time() - attack_started_at if attack_started_at else 0.0

        # Ham veriyi JSON olarak hash'le
        raw_payload = json.dumps(snapshot, sort_keys=True, default=str)
        raw_hash = "sha256:" + hashlib.sha256(raw_payload.encode()).hexdigest()

        package = {
            "evidence_id": evidence_id,
            "timestamp_utc": ts,
            "attack_type": trust_data.get("attack_type", "UNKNOWN"),
            "trust_score_before": self._last_trust_score,
            "trust_score_after": trust_data.get("trust_score", 0),
            "duration_seconds": round(duration, 2),
            "sensor_data_snapshot": snapshot,
            "physics_violations": physics_result.get("violations", []),
            "stats_violations": stats_result.get("violations", []),
            "ml_anomaly_score": ml_result.get("anomaly_score", 0),
            "shap_top_features": xai_data.get("shap", {}).get("top_features", []) if xai_data else [],
            "human_readable_explanation": xai_data.get("summary", "") if xai_data else "",
            "raw_data_hash": raw_hash,
            "signature": self._sign(raw_hash),
        }

        # Kaydet
        path = os.path.join(EVIDENCE_DIR, f"{evidence_id}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(package, f, indent=2, ensure_ascii=False, default=str)

        self._last_trust_score = trust_data.get("trust_score", 100.0)
        return package

    def update_last_trust(self, score: float) -> None:
        self._last_trust_score = score

    def _sign(self, data: str) -> str:
        if not CRYPTO_AVAILABLE or self._private_key is None:
            return "UNSIGNED"
        try:
            sig = self._private_key.sign(
                data.encode(),
                padding.PKCS1v15(),
                hashes.SHA256(),
            )
            return sig.hex()[:64] + "..."  # kısalt (demo)
        except Exception:
            return "SIGN_ERROR"

    def verify_integrity(self, package: dict) -> bool:
        """Ham veri hash'ini doğrula."""
        snapshot = package.get("sensor_data_snapshot", {})
        raw_payload = json.dumps(snapshot, sort_keys=True, default=str)
        expected_hash = "sha256:" + hashlib.sha256(raw_payload.encode()).hexdigest()
        return package.get("raw_data_hash") == expected_hash

    @staticmethod
    def load_all() -> list:
        result = []
        if not os.path.exists(EVIDENCE_DIR):
            return result
        for fname in sorted(os.listdir(EVIDENCE_DIR)):
            if fname.endswith(".json"):
                try:
                    with open(os.path.join(EVIDENCE_DIR, fname), "r", encoding="utf-8") as f:
                        result.append(json.load(f))
                except Exception:
                    pass
        return result
