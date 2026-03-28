# PULSAR — Mimari Belgesi

## Veri Akışı

```
Simülatör (500ms tick)
    ↓
SimulationCoordinator.get_full_snapshot()
    ↓
AttackManager.apply_all()   ← Red Team saldırıları
    ↓
CLVEngine.analyze()
    ├── PhysicsChecker      (< 10ms)
    ├── StatisticsChecker   (< 100ms)
    ├── FeatureExtractor
    ├── MLDetector          (< 200ms)
    ├── TrustScoreEngine
    └── XAICoordinator      (< 300ms, sadece alarm varsa)
         ├── SHAPExplainer
         ├── RuleExplainer
         └── EvidenceBuilder → evidence/logs/EVD-*.json
    ↓
FastAPI WebSocket Push (< 50ms)
    ↓
React Dashboard (gerçek zamanlı güncelleme)
```

## Tehdit Seviyeleri

| Skor | Seviye   | Renk   |
|------|----------|--------|
| 80–100 | SAFE   | Yeşil  |
| 50–79  | WARNING | Sarı  |
| 20–49  | THREAT  | Turuncu |
| 0–19   | CRITICAL | Kırmızı |

## Güven Skoru Formülü

```
TrustScore = 100 × (0.40 × physics + 0.35 × stats + 0.25 × ml)
```

## Klasör Yapısı

```
pulsar/
├── simulation/       # Sensör simülatörleri
├── red_team/         # Saldırı simülatörleri
├── core/
│   ├── detection/    # Tespit motorları
│   └── xai/          # Açıklanabilir AI
├── evidence/logs/    # Hukuki delil paketleri
├── api/              # FastAPI backend
├── dashboard/        # React frontend
├── tests/            # pytest testleri
├── docs/             # Dokümantasyon
├── models/           # Eğitilmiş ML modelleri
└── config.yaml       # Sistem konfigürasyonu
```
