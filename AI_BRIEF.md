# PULSAR Project — AI Assistant Brief

**You are assisting with a 48-hour hackathon project. Here's the complete context.**

---

## Overview

**Project Name:** PULSAR (Position Uncertainty Layered Security & Anomaly Recognition)

**Goal:** Detect GNSS spoofing, jamming, and meaconing attacks using multi-layer cross-validation.

**Target Users:** Drone operators, autonomous vehicles, maritime navigation, critical infrastructure (power grids).

**Why it matters:** GNSS signals are unencrypted. Attackers can deceive receivers. Existing detection (SNR-only) fails against sophisticated spoofing.

---

## The Problem

1. **Jamming:** Attacker floods GNSS frequency with noise → receiver loses signal
2. **Spoofing:** Attacker broadcasts fake GPS signals → receiver thinks it's elsewhere  
3. **Meaconing:** Attacker delays and replays real signals → receiver gets old position as current

Current solutions use **one-dimensional analysis** (SNR only or single ML model). A sophisticated attacker can bypass this.

---

## PULSAR Solution

**Core Principle:** It's impossible for an attacker to simultaneously spoof 5 independent sensors. Cross-validate all of them.

### 5 Data Sources

1. GNSS (GPS position, SNR, Doppler, satellite count)
2. IMU (accelerometer, gyro → dead-reckoning position estimate)
3. NTP time (reference clock)
4. Barometric altitude (independent height estimate)
5. Cell tower distance (signal strength → estimated distance)

### 3-Stage Detection Engine

**Stage 1 — Physics Check (< 10ms)**
- Is GNSS position consistent with IMU dead-reckoning?
- Did GPS jump > 300 km/h in 500ms? (impossible)
- Time stamps agree between GNSS and NTP?
- Satellite count drop > 4 in 5 ticks? (jamming sign)
- Altitude mismatch: GNSS vs barometric > 50m? (spoofing sign)

**Stage 2 — Statistics (< 100ms)**
- Last 20 ticks: SNR variance Z-score test
- Doppler velocity vs GNSS velocity: difference > 5 m/s?
- GDOP quality degradation?
- Pseudorange residuals: chi-square test
- Position variance history: trend detection

**Stage 3 — ML Anomaly Detection (< 500ms)**
- 15-feature vector extracted from all layers
- Isolation Forest model trained on first 200 ticks of normal data
- Detects anomalies without knowing attack type
- Returns: is_anomaly (bool) + anomaly_score (0-1)

### Trust Score Formula

```
Trust_Score = 100 × (0.40 × Physics + 0.35 × Stats + 0.25 × ML)
```

| Score | Status | Action |
|-------|--------|--------|
| 80-100 | SAFE ✅ | Continue |
| 50-79 | WARNING ⚠️ | Heighten monitoring |
| 0-49 | THREAT 🚨 | Alarm + switch to backup |

### XAI Layer (Explainability)

- Every alarm triggers SHAP (SHapley Additive exPlanations)
- Shows top 5 features that contributed to the decision
- Example: "45% from GNSS-IMU discrepancy, 30% from position variance, 15% from pseudorange residuals"
- **Why?** Admissible in court. Kara-kutu (black-box) AI is not.

### Evidence Vault

Every detection creates a cryptographically signed JSON package:
- Attack type, confidence, timing
- All raw sensor readings
- SHAP explanations
- SHA-256 hash (data integrity)
- RSA digital signature (tamper-proof)
- Flag: "ADMISSIBLE_IN_COURT"

---

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Simulation & Core Logic | Python 3.11+ | Fast prototyping, numerical |
| ML | scikit-learn (Isolation Forest) | Lightweight, interpretable |
| API | FastAPI + WebSocket | Real-time, low latency |
| Dashboard | React (Vite) + Recharts | Live graphs, modern UI |
| Cryptography | PyCA/cryptography | RSA signing, SHA-256 hashing |

---

## Architecture

```
┌────────────────────────────────────────────┐
│          PULSAR System Architecture         │
├────────────────────────────────────────────┤
│                                            │
│  Simulation Layer (Python)                 │
│  ├─ GNSSSimulator (position, SNR, etc.)    │
│  ├─ IMUSimulator (accel, gyro, heading)    │
│  ├─ ReferenceSimulator (NTP, baro, tower)  │
│  └─ AttackManager (jamming, spoofing, etc) │
│           ↓                                 │
│  Detection Engine (Python)                 │
│  ├─ PhysicsChecker                         │
│  ├─ StatsChecker                           │
│  ├─ FeatureExtractor                       │
│  ├─ MLDetector (Isolation Forest)          │
│  ├─ TrustScoreEngine                       │
│  └─ XAIExplainer (SHAP)                    │
│           ↓                                 │
│  API & WebSocket (FastAPI)                 │
│  └─ Broadcasts: every 500ms               │
│           ↓                                 │
│  Dashboard (React)                         │
│  ├─ Trust Gauge (0-100)                    │
│  ├─ SNR/Doppler time-series                │
│  ├─ Layer consistency matrix               │
│  ├─ Attack history log                     │
│  └─ Attack trigger buttons (demo)          │
│                                            │
└────────────────────────────────────────────┘
```

---

## Project Structure

```
pulsar/
├── simulation/
│   ├── gnss_sim.py               # GNSS signal simulator
│   ├── imu_sim.py                # IMU sensor simulator
│   ├── reference_sim.py          # Reference sources simulator
│   ├── coordinator.py            # Sync all 3 simulators
│   └── attack_manager.py         # Trigger jamming/spoofing/meaconing
│
├── red_team/
│   ├── base_attack.py            # Abstract attack class
│   ├── jamming_attack.py         # Jamming implementation
│   ├── spoofing_attack.py        # Sophisticated spoofing (slow drift)
│   └── meaconing_attack.py       # Replay with delay
│
├── core/
│   ├── clv_engine.py             # Main detection orchestrator
│   ├── physics_check.py          # Stage 1: Physics violations
│   ├── stats_check.py            # Stage 2: Statistical anomalies
│   ├── feature_extractor.py      # Extract 15-feature vector
│   ├── ml_detector.py            # Stage 3: Isolation Forest
│   ├── trust_score.py            # Combine scores, classify attack
│   ├── xai_engine.py             # SHAP explanations
│   └── evidence_engine.py        # Generate signed JSON
│
├── api/
│   ├── main.py                   # FastAPI + WebSocket
│   └── schemas.py                # Pydantic data models
│
├── dashboard/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── TrustGauge.jsx
│   │   │   ├── SignalCharts.jsx
│   │   │   ├── LayerStatus.jsx
│   │   │   ├── AttackControls.jsx
│   │   │   └── AlertLog.jsx
│   │   └── hooks/
│   │       └── useWebSocket.js
│   └── package.json
│
├── models/
│   └── isolation_forest.pkl      # Trained model (pkl)
│
├── requirements.txt
├── README.md
└── MVP.md
```

---

## Key Differentiators

| Feature | Traditional | PULSAR |
|---------|-------------|--------|
| **Detection method** | SNR only OR single ML | 5 sensors + 3-stage + ML |
| **Sophistic spoofing** | ❌ Misses (SNR normal) | ✅ Catches (cross-validation) |
| **Hardware needed** | SDR devices required | ✅ Pure software |
| **Explainability** | Black box (LSTM/CNN) | White box (SHAP + physics) |
| **Legal evidence** | ❌ Not admissible | ✅ Admissible in court |
| **Attack classification** | Binary | Ternary (jamming/spoofing/meaconing) + confidence score |

---

## Demo Scenario (~10 minutes)

### Scene 1: System Boot (1 min)
Dashboard initializes. All 5 layers synced. Trust score = 95% (SAFE).

### Scene 2: Jamming Attack (3 min)
- Button click: "Start Jamming"
- SNR drops: 40 dB → 0 dB
- Satellites drop: 12 → 2
- **But** IMU and NTP stable → cross-validation detects **inconsistency**
- Physics check: "Satellite dropout > 4 in 5 ticks" ✓
- Trust score: 95% → 18% (CRITICAL)
- Output: `🚨 JAMMING DETECTED`
- Button click: "Stop Attack"
- Trust score: 18% → 95% (recovers)

### Scene 3: Sophisticated Spoofing (4 min)
- Button: "Start Spoofing"
- **Attacker slowly drifts GPS position:** 0.0001°/tick (causes 100m shift per tick)
- SNR **stays at 40 dB** (perfect) → traditional SNR detector is fooled
- But GNSS reports 720 km/h velocity (calculated from position jump)
- IMU says drone is still at 50 km/h
- Physics check failure: `|GNSS velocity - IMU velocity| = 670 km/h` ✓
- Stats check: Position variance explodes 45x ✓
- ML model sees multivariate anomaly ✓
- After 15-20 ticks: Trust score drops to 35%
- Output: `🚨 SPOOFING DETECTED`
- Show SHAP explanation: "45% importance = GNSS-IMU discrepancy"
- **Key message:** "Traditional SNR-only would miss this. PULSAR catches it."

### Scene 4: Results (2 min)
- Accuracy table: Jamming 97%, Spoofing 91%
- Comparison vs LSTM (88%), vs basic SNR (5% on spoofing)

---

## 48-Hour Timeline

| Hours | Task | Deliverable |
|-------|------|-------------|
| 0-6   | Simulate GNSS + IMU + Reference data | 3 consistent data streams |
| 6-14  | Build CLV Engine (3 detection stages) | Attacks detected with scores |
| 14-20 | FastAPI + WebSocket API | Backend ready, real-time push |
| 20-32 | React Dashboard + Recharts graphs | Visual interface complete |
| 32-40 | End-to-end integration + demo scenarios | 10-min demo works flawlessly |
| 40-44 | Bug fixes + performance tweaking | System stable |
| 44-48 | Final presentation practice | Jury-ready |

---

## Success Criteria

- [x] 5 data sources simulated consistently
- [ ] Cross-validation engine detects layer mismatches
- [ ] Jamming detected 95%+ accuracy
- [ ] Sophisticated spoofing (slow drift) detected 90%+ accuracy
- [ ] Dashboard real-time trust score + 4 graphs
- [ ] Demo runs 10 min without interruption
- [ ] Jury sees "classical methods fail, PULSAR catches it" moment
- [ ] XAI explanation provided (SHAP top 5 features)
- [ ] Evidence JSON signed + cryptographically verified

---

## Common Questions & Answers

**Q: Why not CNN/LSTM for higher accuracy?**

A: CNN/LSTM would achieve 99% accuracy BUT:
- Requires training data (we have none in hackathon)
- Black box (no explanation = not admissible in court)
- Slower real-time computation
- Isolation Forest: instant results, interpretable, no data needed

**Q: Why Isolation Forest specifically?**

A: - Fast (O(n log n))
- No training data dependency
- Detects anomalies without knowing attack patterns
- Interpretable (can trace which samples marked anomalous)
- Proven in time-series anomaly detection

**Q: Real GNSS data instead of simulation?**

A: Future work. Simulation is physically accurate. For hackathon, demo value is clear without live GPS receiver.

**Q: How is this different from GNSS-Shield (2024)?**

A: GNSS-Shield achieves 99.47% with federated learning (impressive). But:
- Closed source
- Black box deep learning
- Requires lots of training data
- Not explainable

PULSAR:
- Open source
- White box (interpretable)
- Works with zero data (simulation pre-loaded)
- SHAP explanations + legal evidence package

**Q: Can this work offline?**

A: Yes. Simulation is built-in. No network needed. Demo works anywhere.

---

## Next Steps (Outside Hackathon)

1. Integrate real GNSS receiver (Ublox, NovAtel)
2. Feed real-world datasets (UT-Austin drone, maritime)
3. Formal legal validation in courts
4. Federated learning variant for distributed defense
5. V2V (vehicle-to-vehicle) consensus detection
6. Integration with autopilot systems (ArduPilot, PX4)

---

## Files to Show Other Developers

- `MVP.md` — 16-page project overview (this brief is condensed version)
- `PLAN.md` — Detailed 48-hour timeline + code stubs
- `RAPOR.md` — Academic report (Turkish, for judges)

---

**End of Brief. Ready to code!**
