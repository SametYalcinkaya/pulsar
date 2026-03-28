from pydantic import BaseModel
from typing import Optional, List, Any


class GNSSData(BaseModel):
    latitude: float
    longitude: float
    altitude: float
    snr_mean: float
    snr_std: float
    snr_min: float
    satellite_count: int
    gdop: float
    pdop: float
    doppler_shift_hz: float
    pseudorange_residual_std: float
    timestamp_gnss: int


class IMUData(BaseModel):
    accel_x: float
    accel_y: float
    accel_z: float
    gyro_x: float
    gyro_y: float
    gyro_z: float
    heading_deg: float
    speed_ms: float
    speed_kmh: float
    dead_reckoning: dict


class ReferenceData(BaseModel):
    ntp_timestamp: float
    ntp_offset_ms: float
    cell_tower_lat: float
    cell_tower_lon: float
    cell_tower_distance_m: float
    barometric_altitude_m: float


class PhysicsResult(BaseModel):
    passed: bool
    score: float
    violations: List[str]


class StatsResult(BaseModel):
    passed: bool
    score: float
    violations: List[str]


class MLResult(BaseModel):
    is_anomaly: bool
    anomaly_score: float
    ml_score: float


class AnalysisResult(BaseModel):
    tick: int
    trust_score: float
    threat_level: str
    attack_type: Optional[str]
    physics_result: PhysicsResult
    stats_result: StatsResult
    ml_result: MLResult
    xai_result: Optional[dict]
    timings_ms: dict


class AttackCommand(BaseModel):
    attack_name: str
    params: Optional[dict] = None


class EvidencePackage(BaseModel):
    evidence_id: str
    timestamp_utc: str
    attack_type: str
    trust_score_before: float
    trust_score_after: float
    duration_seconds: float
    physics_violations: List[str]
    stats_violations: List[str]
    ml_anomaly_score: float
    shap_top_features: List[Any]
    human_readable_explanation: str
    raw_data_hash: str
    signature: str


class TickPayload(BaseModel):
    type: str = "tick"
    tick: int
    trust_score: float
    threat_level: str
    attack_type: Optional[str]
    gnss: dict
    imu: dict
    reference: dict
    physics_result: dict
    stats_result: dict
    ml_result: dict
    xai_summary: Optional[str]
    active_attack: Optional[str]
    timings_ms: dict
