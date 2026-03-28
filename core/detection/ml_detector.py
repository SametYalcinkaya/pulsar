import numpy as np
import os
import pickle
from sklearn.ensemble import IsolationForest
from collections import deque
from typing import Tuple


MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "models", "isolation_forest.pkl")


class MLDetector:
    """
    Isolation Forest tabanlı anomali tespiti.
    İlk 200 tick normal veriyle warm-up eğitimi.
    Her 50 tick normal dönemde online güncelleme.
    """

    WARMUP_TICKS = 200
    UPDATE_INTERVAL = 50
    CONTAMINATION = 0.05
    N_ESTIMATORS = 200

    def __init__(self):
        self._model: IsolationForest = IsolationForest(
            contamination=self.CONTAMINATION,
            n_estimators=self.N_ESTIMATORS,
            random_state=42,
        )
        self._warmup_buffer: deque = deque(maxlen=self.WARMUP_TICKS)
        self._is_trained: bool = False
        self._tick: int = 0
        self._normal_buffer: deque = deque(maxlen=self.UPDATE_INTERVAL * 2)
        self._load_model()

    def _load_model(self) -> None:
        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, "rb") as f:
                    self._model = pickle.load(f)
                self._is_trained = True
            except Exception:
                pass

    def _save_model(self) -> None:
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        with open(MODEL_PATH, "wb") as f:
            pickle.dump(self._model, f)

    def predict(self, features: np.ndarray) -> Tuple[bool, float]:
        """
        Returns: (is_anomaly: bool, anomaly_score: float)
        anomaly_score: negatif = daha anormal (-1 en kötü, 0 normal sınırı)
        """
        self._tick += 1

        if not self._is_trained:
            # Warm-up: veri topla
            self._warmup_buffer.append(features.copy())
            if len(self._warmup_buffer) >= self.WARMUP_TICKS:
                X = np.array(list(self._warmup_buffer))
                self._model.fit(X)
                self._is_trained = True
                self._save_model()
            return False, 0.0

        # Tahmin yap
        score = float(self._model.score_samples(features.reshape(1, -1))[0])
        pred = int(self._model.predict(features.reshape(1, -1))[0])
        is_anomaly = pred == -1

        # Online learning: sadece normal dönemde güncelle
        if not is_anomaly:
            self._normal_buffer.append(features.copy())
            if self._tick % self.UPDATE_INTERVAL == 0 and len(self._normal_buffer) >= self.UPDATE_INTERVAL:
                X_update = np.array(list(self._normal_buffer))
                self._model.fit(X_update)
                self._save_model()

        return is_anomaly, score
