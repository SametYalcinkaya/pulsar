# PULSAR — Tam Uygulama Planı
> Özgün Değer: **XAI (Açıklanabilir AI) + Hukuki Delil Motoru + Kırmızı Takım Saldırı Simülatörü**

Mevcut projelerden farkı:
1. **Red-Blue Team** → Hem saldırıyı hem savunmayı aynı sistemde çalıştır
2. **XAI Motoru** → Her alarm için "neden?" sorusunu yanıtla
3. **Hukuki Delil Kaydı** → İmzalı, zaman damgalı JSON delil paketi üret

---

## FAZ 0 — Ortam Kurulumu
**Süre: 2 saat | Python 3.11, Node 20, Git**

### 0.1 Repo ve Klasör Yapısı
- [ ] Klasör yapısını oluştur:
```
pulsar/
├── simulation/
├── red_team/
├── core/
│   ├── detection/
│   └── xai/
├── evidence/
├── api/
├── dashboard/
├── tests/
└── docs/
```
- [ ] `.gitignore` ekle (Python, Node, venv)
- [ ] `README.md` iskeletini oluştur

### 0.2 Python Ortamı
- [ ] `python -m venv .venv`
- [ ] `requirements.txt` oluştur:
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
websockets==12.0
numpy==1.26.4
pandas==2.2.2
scikit-learn==1.4.2
shap==0.45.0
scipy==1.13.0
pydantic==2.7.1
python-dotenv==1.0.1
pytest==8.2.0
httpx==0.27.0
cryptography==42.0.7
```
- [ ] `pip install -r requirements.txt`

### 0.3 Node/React Ortamı
- [ ] `cd dashboard && npm create vite@latest . -- --template react`
- [ ] `npm install recharts framer-motion lucide-react axios`

### 0.4 Mimari Karar Belgesi (`docs/architecture.md`)
- [ ] Veri akışı: Simülatör → FastAPI → WebSocket → React
- [ ] Her tick: 500ms
- [ ] XAI çıktısı anomali tespitinde `evidence/` klasörüne yazılır
- [ ] Red Team kontrolü `/api/attack` endpoint'inden tetiklenir

---

## FAZ 1 — Simülasyon Motoru
**Süre: 5 saat | Python, NumPy, SciPy**

### 1.1 GNSS Sinyal Simülatörü (`simulation/gnss_sim.py`)
- [ ] `GNSSSimulator` sınıfı oluştur
- [ ] Her tick'te şu verileri üret:
  - `latitude`, `longitude` (başlangıç: 41.0082°N, 28.9784°E — İstanbul)
  - `altitude` (metre)
  - `snr_db` — her uydu için (normal: 35–45 dB)
  - `satellite_count` — görünen uydu sayısı (normal: 9–14)
  - `gdop`, `pdop`, `hdop` — uydu geometri kalitesi
  - `doppler_shift_hz` — Doppler kayması (Hz)
  - `pseudorange_residuals` — uydu başına artıklar
  - `timestamp_gnss` — nanosaniye hassasiyetli zaman
- [ ] Normal gürültü: `lat += np.random.normal(0, 0.00001)`
- [ ] GDOP normal aralık: 1.5–3.0
- [ ] `get_state()` → dict döndür

### 1.2 IMU Sensör Simülatörü (`simulation/imu_sim.py`)
- [ ] `IMUSimulator` sınıfı oluştur
- [ ] Her tick'te üret:
  - `accel_x/y/z` (m/s²) — sabit araç: ~(0, 0, 9.81)
  - `gyro_x/y/z` (rad/s) — sabit araç: ~0
  - `heading_deg` — manyetometre yön açısı (0–360°)
  - `temperature_c` — sensör sıcaklığı
- [ ] Dead-reckoning: `imu_pos = prev_pos + velocity * dt`
- [ ] Drift modeli: `drift_rate = 0.001 m/s²`
- [ ] `get_dead_reckoning_position()` → IMU tabanlı konum tahmini
- [ ] **IMU fiziksel — saldırıdan etkilenmez** (docstring'e yaz)

### 1.3 Referans Kaynak Simülatörü (`simulation/reference_sim.py`)
- [ ] `ReferenceSimulator` sınıfı oluştur
- [ ] Her tick'te üret:
  - `ntp_timestamp` — NTP simülasyonu (UTC)
  - `cell_tower_lat/lon` — sabit baz istasyonu
  - `cell_tower_distance_m` — sinyal gücüne dayalı mesafe
  - `barometric_altitude_m` — barometre tabanlı yükseklik
- [ ] NTP gürültü: `ntp_offset_ms = random.gauss(0, 2)` (±2ms normal)

### 1.4 Veri Koordinatörü (`simulation/coordinator.py`)
- [ ] `SimulationCoordinator` sınıfı oluştur
- [ ] Her tick'te 3 simülatörü senkron çalıştır
- [ ] `get_full_snapshot()` → tüm sensör verisi tek dict:
```python
{"tick": int, "timestamp": float,
 "gnss": {}, "imu": {}, "reference": {},
 "attack_active": str | None}
```
- [ ] `inject_attack(attack_type, params)` hook'u
- [ ] `TICK_INTERVAL_MS = 500`

---

## FAZ 2 — Kırmızı Takım Saldırı Motoru
**Süre: 4 saat | Python, NumPy**

> Hiçbir açık kaynak proje hem saldırıyı hem tespiti aynı sistemde çalıştırmıyor.

### 2.1 Saldırı Temel Sınıfı (`red_team/base_attack.py`)
- [ ] `BaseAttack` abstract sınıfı oluştur:
  - `name: str`, `severity: str`, `is_active: bool`, `start_tick: int`
  - `apply(gnss_data, tick) -> dict` abstract metod
  - `get_metadata() -> dict` abstract metod

### 2.2 Jamming Saldırısı (`red_team/jamming_attack.py`)
- [ ] `JammingAttack(BaseAttack)` oluştur
- [ ] Mantık:
  - SNR kademeli düşür: her tick `snr -= 2.5 dB`
  - Uydu kaybı: her 3 tick'te 1 uydu
  - GDOP boz: geometri kötüleştikçe artar
  - Doppler gürültü: `doppler += random.gauss(0, 50)`
- [ ] `intensity` (0.0–1.0) ve `ramp_up_ticks` parametreleri
- [ ] IMU ve referans verisine **dokunma**

### 2.3 Spoofing Saldırısı (`red_team/spoofing_attack.py`)
- [ ] `SpoofingAttack(BaseAttack)` oluştur
- [ ] **Sofistike mod** (tespit edilmesi zor):
  - Konum çok yavaş kayar: `drift_rate = 0.0001 deg/tick`
  - SNR **normal kalır** → klasik SNR tespiti başarısız
  - Sahte konum kuzey-doğu yönünde kayar
- [ ] **Agresif mod**: anlık büyük sıçrama + zaman kaydırma
- [ ] `target_lat`, `target_lon`, `drift_speed` parametreleri

### 2.4 Meaconing Saldırısı (`red_team/meaconing_attack.py`)
- [ ] `MeaconingAttack(BaseAttack)` oluştur
- [ ] `delay_buffer` → son N tick verisini sakla
- [ ] `delay_ticks` önceki konumu mevcut output olarak döndür
- [ ] Zaman damgasını da geciktir → NTP tutarsızlığı
- [ ] `delay_ticks` parametresi: 3–20 arası

### 2.5 Saldırı Yöneticisi (`red_team/attack_manager.py`)
- [ ] `AttackManager` sınıfı oluştur
- [ ] `activate(attack_name, params)` — saldırı başlat
- [ ] `deactivate(attack_name)` — saldırı durdur
- [ ] `apply_all(gnss_data, tick)` — aktif saldırıları uygula
- [ ] Birden fazla saldırı aynı anda aktif olabilsin (combined attack)
- [ ] `attack_log: List[AttackEvent]` — saldırı geçmişi

---

## FAZ 3 — Tespit Motoru (CLV Engine)
**Süre: 5 saat | Python, NumPy, SciPy, scikit-learn**

### 3.1 Fiziksel Tutarlılık Kontrolü (`core/detection/physics_check.py`)
- [ ] `PhysicsChecker` sınıfı oluştur
- [ ] **Kontrol 1 — Konum-IMU Tutarlılığı:**
  - `discrepancy_m = distance(gnss_pos, imu_estimated_pos)`
  - Eşik: `> 15 m` → şüpheli
- [ ] **Kontrol 2 — Fizik İzin Vermez Hız:**
  - `speed_kmh = position_delta / time_delta * 3.6`
  - Eşik: `> 300 km/h` → kesin saldırı
- [ ] **Kontrol 3 — Zaman Tutarlılığı:**
  - `gnss_time` ile `ntp_time` farkı
  - Normal: `<50ms` / Şüpheli: `>200ms` / Tehdit: `>1000ms`
- [ ] **Kontrol 4 — Uydu Sayısı Ani Düşüşü:**
  - Son 5 tick'te `satellite_drop > 4` → jamming şüphesi
- [ ] **Kontrol 5 — Barometrik Uyuşmazlık:**
  - GNSS altitude − baro altitude: Normal `<20m` / Şüpheli `>50m`
- [ ] `check_all(snapshot)` → `PhysicsResult(passed, score, violations)`

### 3.2 İstatistiksel Analiz Motoru (`core/detection/stats_check.py`)
- [ ] `StatisticsChecker` sınıfı oluştur
- [ ] Rolling window: son 20 tick (`deque(maxlen=20)`)
- [ ] **Analiz 1 — SNR Varyans:** Z-score `> 3σ` → outlier
- [ ] **Analiz 2 — Doppler-Hız Tutarsızlığı:**
  - `doppler_velocity = doppler_shift × 0.1903` (L1 dalga boyu)
  - Fark `> 5 m/s` → tutarsızlık
- [ ] **Analiz 3 — GDOP Bozulması:** `GDOP > 6.0` → kötü geometri
- [ ] **Analiz 4 — Pseudorange Chi-Square:** `p < 0.05` → anomali
- [ ] **Analiz 5 — Konum Varyans:** Linear regression ile sistematik kayma testi
- [ ] `check_all(window_data)` → `StatsResult`

### 3.3 ML Katmanı (`core/detection/ml_detector.py`)
- [ ] `MLDetector` sınıfı oluştur
- [ ] 15 özellikli vektör:
```
snr_mean, snr_std, snr_min,
satellite_count, gdop, pdop,
position_discrepancy_m, doppler_velocity_diff,
ntp_offset_ms, position_variance,
imu_heading_gnss_heading_diff,
pseudorange_residual_std,
barometric_altitude_diff, speed_kmh,
satellite_count_delta
```
- [ ] Isolation Forest: `contamination=0.05`, `n_estimators=200`, `random_state=42`
- [ ] İlk 200 tick normal veriyle warm-up eğitimi
- [ ] Model: `models/isolation_forest.pkl` olarak kaydet
- [ ] `predict(features)` → `(is_anomaly: bool, anomaly_score: float)`
- [ ] Online learning: her 50 tick'te normal dönemde güncelle

### 3.4 Özellik Çıkarımı (`core/detection/feature_extractor.py`)
- [ ] `FeatureExtractor` sınıfı oluştur
- [ ] `extract(snapshot, window_data)` → 15 elemanlı numpy array
- [ ] MinMaxScaler ile normalizasyon
- [ ] Eksik veri için safe default değerler

### 3.5 CLV Motor Koordinatörü (`core/clv_engine.py`)
- [ ] `CLVEngine` sınıfı oluştur
- [ ] `analyze(snapshot)` akışı:
  1. PhysicsChecker çalıştır (<10ms)
  2. StatsChecker çalıştır (<100ms)
  3. FeatureExtractor ile özellik çıkar
  4. MLDetector çalıştır (<500ms)
  5. Güven skoru hesapla
  6. XAI motorunu çalıştır
  7. Delil kaydı oluştur (alarm varsa)
  8. `AnalysisResult` döndür
- [ ] Her aşamanın süresini logla

### 3.6 Güven Skoru ve Karar Motoru (`core/trust_score.py`)
- [ ] `TrustScoreEngine` sınıfı oluştur
- [ ] Formül:
  ```
  TrustScore = 100 × (0.40×physics + 0.35×stats + 0.25×ml)
  ```
- [ ] Ağırlıklar `config.yaml`'dan okunabilsin
- [ ] Saldırı tipi: `JAMMING` / `SPOOFING` / `MEACONING` / `COMBINED` / `UNKNOWN`
- [ ] Tehdit seviyeleri:
  - `80–100` → SAFE ✅
  - `50–79` → WARNING ⚠️
  - `20–49` → THREAT 🚨
  - `0–19`  → CRITICAL 💀

---

## FAZ 4 — Açıklanabilir AI (XAI) + Hukuki Delil Motoru
**Süre: 4 saat | Python, SHAP, cryptography**

> Hiçbir mevcut sistem "neden alarm verdim?" sorusunu yanıtlamıyor.

### 4.1 SHAP Tabanlı XAI Motoru (`core/xai/shap_explainer.py`)
- [ ] `SHAPExplainer` sınıfı oluştur
- [ ] `shap.TreeExplainer(isolation_forest_model)` ile sar
- [ ] `explain(feature_vector)` → SHAP değerleri + en etkili 5 özellik
- [ ] Özellik isimlerini Türkçe açıklamayla eşleştir:
```python
"position_discrepancy_m": "GNSS konumu ile IMU tahmini arasındaki mesafe farkı"
"ntp_offset_ms":          "GNSS ile NTP referans zamanı arasındaki fark"
"snr_std":                "Sinyal gücü varyansı — ani değişim saldırı belirtisi"
```
- [ ] `get_human_readable_report()` → string rapor döndür

### 4.2 Kural Tabanlı Açıklama Motoru (`core/xai/rule_explainer.py`)
- [ ] `RuleExplainer` sınıfı oluştur
- [ ] Fiziksel ihlalleri doğal dille açıkla. Örnek:
```
"Araç saatte 847 km hareket etmiş görünüyor.
 Bu fiziksel olarak imkânsız. Konum manipülasyonu tespit edildi."

"GNSS zaman damgası NTP'den 3.2 saniye geride.
 Eski sinyal tekrar yayınlanıyor olabilir (Meaconing)."
```
- [ ] Her açıklama için `confidence_percent` ekle
- [ ] Tehdit seviyesine göre renk kodu (dashboard için)

### 4.3 Hukuki Delil Paketi Üretici (`evidence/evidence_builder.py`)
- [ ] `EvidenceBuilder` sınıfı oluştur
- [ ] Alarm tetiklendiğinde oluşturulacak JSON:
```json
{
  "evidence_id": "EVD-2026-0327-001",
  "timestamp_utc": "2026-03-27T20:15:33.421Z",
  "attack_type": "SPOOFING",
  "trust_score_before": 94,
  "trust_score_after": 31,
  "duration_seconds": 18.5,
  "sensor_data_snapshot": {},
  "physics_violations": [],
  "stats_violations": [],
  "ml_anomaly_score": -0.72,
  "shap_top_features": [],
  "human_readable_explanation": "...",
  "raw_data_hash": "sha256:...",
  "signature": "..."
}
```
- [ ] Ham verinin SHA-256 hash'i → veri bütünlüğü kanıtı
- [ ] RSA imza oluştur (`cryptography` — demo key pair)
- [ ] `evidence/logs/EVD-{id}.json` olarak kaydet
- [ ] `verify_integrity(package)` → bütünlük doğrulama metodu

### 4.4 XAI Koordinatörü (`core/xai/xai_coordinator.py`)
- [ ] `XAICoordinator` sınıfı oluştur
- [ ] CLV Engine sonuçlarını pipeline'dan geçir:
  1. SHAP açıklaması hesapla
  2. Kural açıklaması üret
  3. Birleşik rapor oluştur
  4. Delil paketi oluştur (alarm varsa)
- [ ] `/api/explain/{evidence_id}` endpoint'iyle erişilebilir

---

## FAZ 5 — Backend API ve Gerçek Zamanlı Veri Akışı
**Süre: 3 saat | FastAPI, WebSocket, Uvicorn**

### 5.1 FastAPI Uygulama (`api/main.py`)
- [ ] FastAPI uygulaması oluştur
- [ ] CORS middleware ekle (React için)
- [ ] Lifespan yönetimi: startup'ta simülatör başlat
- [ ] `/health` endpoint

### 5.2 WebSocket Gerçek Zamanlı Akış (`api/websocket_handler.py`)
- [ ] `/ws` WebSocket endpoint'i
- [ ] Her 500ms'de push et:
```json
{
  "type": "tick", "tick": 142,
  "trust_score": 87, "threat_level": "SAFE",
  "attack_type": null,
  "gnss": {}, "imu": {}, "reference": {},
  "physics_result": {}, "stats_result": {}, "ml_result": {},
  "xai_summary": "...", "active_attack": null
}
```
- [ ] Birden fazla client bağlanabilsin (connection pool)
- [ ] Bağlantı koptuğunda graceful cleanup

### 5.3 REST Endpoint'leri
- [ ] `POST /api/attack/start` — saldırı başlat
- [ ] `POST /api/attack/stop` — aktif saldırıyı durdur
- [ ] `GET  /api/attack/status` — aktif saldırı bilgisi
- [ ] `GET  /api/evidence` — tüm delil paketleri listesi
- [ ] `GET  /api/evidence/{id}` — belirli delil paketi
- [ ] `GET  /api/history?limit=100` — son N tick verisi
- [ ] `GET  /api/stats` — tespit istatistikleri
- [ ] `POST /api/reset` — simülatörü sıfırla

### 5.4 Pydantic Veri Modelleri (`api/schemas.py`)
- [ ] `GNSSData`, `IMUData`, `ReferenceData`
- [ ] `PhysicsResult`, `StatsResult`, `MLResult`
- [ ] `AnalysisResult`, `AttackCommand`, `EvidencePackage`
- [ ] `TickPayload` — WebSocket mesaj şeması

### 5.5 Arka Plan Tick Döngüsü (`api/background.py`)
- [ ] `asyncio` ile döngü oluştur
- [ ] Her 500ms'de:
  1. Snapshot al
  2. CLV analizi çalıştır
  3. XAI çalıştır (async)
  4. Tüm client'lara push et
- [ ] Hata durumunda graceful recovery

---

## FAZ 6 — Dashboard (Görsel Arayüz)
**Süre: 6 saat | React, Vite, Recharts, Framer Motion**

### 6.1 Tasarım Sistemi (`dashboard/src/index.css`)
- [ ] CSS design tokens:
```css
:root {
  --bg-primary:   #0a0e1a;
  --bg-secondary: #0f1629;
  --bg-card:      #141c35;
  --border:       rgba(99,179,237,0.15);
  --safe:         #10b981;
  --warning:      #f59e0b;
  --threat:       #ef4444;
  --critical:     #dc2626;
  --accent:       #3b82f6;
  --text-primary: #e2e8f0;
  --text-muted:   #94a3b8;
}
```
- [ ] Glassmorphism kart stili
- [ ] Glow animasyonları: safe=yeşil, threat=kırmızı pulse
- [ ] Inter fontunu Google Fonts'tan import et

### 6.2 WebSocket Hook (`dashboard/src/hooks/useWebSocket.js`)
- [ ] Otomatik yeniden bağlanma (reconnect)
- [ ] `data` — son tick verisi
- [ ] `history` — son 100 tick (grafikler için)
- [ ] `connectionStatus` — `connecting | connected | disconnected`

### 6.3 Güven Skoru Göstergesi (`dashboard/src/components/TrustGauge.jsx`)
- [ ] SVG tabanlı dairesel gauge (Recharts RadialBarChart)
- [ ] Renk: 0–49 kırmızı / 50–79 sarı / 80–100 yeşil
- [ ] Smooth animasyon (Framer Motion)
- [ ] Alarm durumunda kırmızı pulse glow
- [ ] Saldırı tipi rozeti: `JAMMING | SPOOFING | MEACONING | SAFE`

### 6.4 Canlı Sinyal Grafikleri (`dashboard/src/components/SignalCharts.jsx`)
- [ ] Recharts LineChart ile 4 grafik:
  - SNR (dB) — kırmızı eşik çizgisiyle
  - Konum Sapması (IMU–GNSS farkı, metre)
  - NTP Zaman Farkı (ms)
  - GDOP Değeri
- [ ] Gerçek zamanlı kayar pencere (son 100 tick)
- [ ] Saldırı aktifken arkaplan kırmızı şerit

### 6.5 Katman Durumu Paneli (`dashboard/src/components/LayerStatus.jsx`)
- [ ] 3 katman durumu kartı:
  - 🛰️ GNSS (SNR, uydu sayısı, GDOP)
  - 📱 IMU (hız, yön, dead-reckoning farkı)
  - 🌐 Referans (NTP farkı, baz istasyonu mesafesi)
- [ ] Normal=yeşil border, anormal=kırmızı animasyon
- [ ] Tutarsız katmanı görsel olarak vurgula
- [ ] Fizik/İstatistik/ML skoru: progress bar

### 6.6 Kırmızı Takım Kontrol Paneli (`dashboard/src/components/AttackControls.jsx`)
- [ ] 3 büyük saldırı butonu (hover animasyonlu):
  - 🔴 Jamming Başlat
  - 🟠 Spoofing Başlat
  - 🟡 Meaconing Başlat
- [ ] Aktif butonda pulse animasyonu
- [ ] ⏹ Durdur butonu
- [ ] Şiddet slider'ı (0–100%)
- [ ] Kombine Saldırı butonu (iki saldırı aynı anda)
- [ ] Aktif saldırı banner'ı: `⚠️ RED TEAM ATTACK ACTIVE: SPOOFING`

### 6.7 XAI Açıklama Paneli (`dashboard/src/components/XAIPanel.jsx`)
- [ ] Alarm tetiklendiğinde slide-in panel
- [ ] **"Neden alarm verdi?"** başlığı
- [ ] SHAP özellik sıralaması: yatay bar chart (en etkili üstte)
- [ ] İnsan-okunabilir kural açıklamaları listesi
- [ ] `evidence_id` göster — kopyalanabilir
- [ ] **"Delil Paketini İndir"** butonu → JSON indir
- [ ] Typewriter efekti: açıklamalar teker teker görünür

### 6.8 Alarm Geçmişi ve Delil Logu (`dashboard/src/components/AlertLog.jsx`)
- [ ] Scrollable tablo: Zaman / Saldırı Tipi / Güven Skoru / Süre / Delil ID
- [ ] Satıra tıklayınca XAI paneli açılır
- [ ] Renk kodlama: kritik=kırmızı / tehdit=turuncu / uyarı=sarı
- [ ] Export butonu: tüm geçmişi CSV olarak indir

### 6.9 Ana Uygulama Layout (`dashboard/src/App.jsx`)
- [ ] CSS Grid layout:
```
┌─────────────────────────────────────────────┐
│  PULSAR  [bağlantı]  [saat]                 │ ← Header
├──────────┬──────────────────┬───────────────┤
│TrustGauge│  SignalCharts    │AttackControls │
│  (büyük) │  (4 grafik)     │(butonlar)     │
├──────────┴──────────────────┤               │
│ LayerStatus (3 kart)        │  AlertLog     │
└─────────────────────────────┴───────────────┘
```
- [ ] Responsive CSS Grid
- [ ] Header: bağlantı durumu yeşil/kırmızı nokta
- [ ] Tam dark mode, glassmorphism kartlar

---

## FAZ 7 — Entegrasyon ve Test
**Süre: 4 saat | pytest, httpx**

### 7.1 Birim Testler (`tests/`)
- [ ] `test_physics_check.py`:
  - Normal veri → ihlal yok
  - 500 km/h hız → fizik ihlali tespit edildi
  - NTP farkı 5 saniye → zaman ihlali tespit edildi
- [ ] `test_stats_check.py`:
  - SNR ani düşüş → anomali tespit edildi
  - Normal varyans → geçti
- [ ] `test_attack_manager.py`:
  - Jamming başlat → SNR düştü
  - Spoofing başlat → konum kaydı
  - Durdur → normale döndü
- [ ] `test_trust_score.py`:
  - Tüm skorlar yüksek → güven 95+
  - Physics fail → güven 30 altı
- [ ] `test_evidence_builder.py`:
  - Delil paketi oluştu
  - Hash hesaplandı, bütünlük doğrulandı
- [ ] `pytest tests/ -v --tb=short` → tüm testler geçiyor
- [ ] `pytest --cov=core --cov=simulation --cov=red_team` — coverage raporu

### 7.2 Uçtan Uca Entegrasyon Testi
- [ ] `uvicorn api.main:app --reload` başlat
- [ ] WebSocket bağlantısını test et
- [ ] Saldırı başlat → frontend alarm görsün → XAI açıklaması gelsin
- [ ] `evidence/logs/` klasöründe JSON oluşsun
- [ ] Saldırıyı durdur → güven normale dönsün
- [ ] 3 ayrı tarayıcıda aç → tümü senkron güncellensin

### 7.3 Performans Testleri
- [ ] Tick toplam süre: `< 500ms`
- [ ] Physics check: `< 10ms`
- [ ] Stats check: `< 100ms`
- [ ] ML prediction: `< 200ms`
- [ ] SHAP (alarm durumunda): `< 300ms`
- [ ] WebSocket push gecikmesi: `< 50ms`
- [ ] Gerekirse SHAP'ı async yap — alarm yoksa atlat

### 7.4 Demo Kuru Provası
- [ ] Senaryo 1: Normal → Jamming → Durdur (3 dak)
- [ ] Senaryo 2: Normal → Sofistike Spoofing → Durdur (4 dak)
- [ ] Senaryo 3: Meaconing + XAI paneli (3 dak)
- [ ] 10 dakika kesintisiz demo çalışsın

---

## FAZ 8 — Demo ve Sunum Hazırlığı
**Süre: 3 saat**

### 8.1 Demo Script (`docs/demo_script.md`)
- [ ] 10 dakikalık akış:
  - `0:00–1:00` → Dashboard açılışı, güven skoru 96, sistem tanıtımı
  - `1:00–3:30` → Jamming → alarm → XAI açıklaması göster
  - `3:30–7:00` → Sofistike Spoofing → "klasik sistem bunu kaçırırdı" vurgusu
  - `7:00–9:00` → Delil paketini indir, içeriğini aç
  - `9:00–10:00` → Klasik vs PULSAR karşılaştırma tablosu

### 8.2 Özgün Değer Karşılaştırması
- [ ] Jüri için tablo hazırla:
```
Mevcut Sistemler:         PULSAR:
──────────────────        ──────────────────────────────
Sadece savunma    →       Red-Blue Team çerçevesi
Kara kutu ML      →       XAI: "Neden?" sorusunu yanıtlar
Alarm üretir      →       Hukuki delil paketi + imza
Simülasyon yok    →       Saldırı simülatörü dahil
Donanım şart      →       Tamamen yazılım tabanlı
```

### 8.3 Final Kontrol Listesi
- [ ] `pytest tests/` → tüm testler yeşil
- [ ] Backend 5 dakika kesintisiz çalışıyor
- [ ] Frontend her saldırıda doğru alarm gösteriyor
- [ ] XAI paneli açılıyor, anlamlı açıklamalar üretiyor
- [ ] Delil paketi indirilebiliyor ve doğrulanabiliyor
- [ ] `README.md` eksiksiz: kurulum + çalıştırma + proje açıklaması
- [ ] `requirements.txt` güncel
- [ ] Git commit geçmişi temiz ve anlamlı mesajlar içeriyor

---

## Özet Tablo

| Faz | İçerik | Süre | Bağımlı Faz |
|-----|--------|------|-------------|
| 0 | Ortam kurulumu | 2 saat | — |
| 1 | Simülasyon motoru | 5 saat | 0 |
| 2 | Red Team saldırı motoru | 4 saat | 1 |
| 3 | CLV tespit motoru | 5 saat | 1, 2 |
| 4 | XAI + Delil motoru | 4 saat | 3 |
| 5 | FastAPI backend | 3 saat | 1, 2, 3, 4 |
| 6 | React dashboard | 6 saat | 5 (paralel başlanabilir) |
| 7 | Test + entegrasyon | 4 saat | 5, 6 |
| 8 | Demo + sunum | 3 saat | 7 |
| **Toplam** | | **36 saat** | |

> **Not:** FAZ 6 ile FAZ 5 kısmen paralel geliştirilebilir.
> Önce WebSocket mesaj şemasını sabitle, frontend mock veriyle başlasın.
