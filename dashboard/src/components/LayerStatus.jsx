import { motion } from 'framer-motion';

function ProgressBar({ value, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 6, margin: '4px 0' }}>
      <motion.div
        style={{ height: '100%', borderRadius: 4, background: color }}
        animate={{ width: `${Math.round(value * 100)}%` }}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

function LayerCard({ icon, title, items, score, anomaly }) {
  const borderColor = anomaly ? '#ef4444' : '#10b981';
  return (
    <motion.div
      animate={anomaly ? {
        boxShadow: [`0 0 0px #ef4444`, `0 0 16px #ef4444`, `0 0 0px #ef4444`],
      } : { boxShadow: 'none' }}
      transition={{ duration: 1, repeat: Infinity }}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        padding: 16,
        flex: 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
        <span style={{
          marginLeft: 'auto', fontSize: 10,
          color: anomaly ? '#ef4444' : '#10b981',
          fontWeight: 600,
        }}>
          {anomaly ? 'ANORMAL' : 'NORMAL'}
        </span>
      </div>
      {items.map(({ label, value }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
          <span style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
        </div>
      ))}
      <div style={{ marginTop: 8 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Skor</span>
        <ProgressBar value={score} color={anomaly ? '#ef4444' : '#10b981'} />
      </div>
    </motion.div>
  );
}

export default function LayerStatus({ data }) {
  const gnss = data?.gnss;
  const imu = data?.imu;
  const ref = data?.reference;
  const physics = data?.physics_result;
  const stats = data?.stats_result;
  const ml = data?.ml_result;

  const physicsAnomaly = !(physics?.passed ?? true);
  const statsAnomaly = !(stats?.passed ?? true);
  const mlAnomaly = ml?.is_anomaly ?? false;

  return (
    <div className="card">
      <h3 style={{ color: 'var(--text-muted)', fontSize: 12, letterSpacing: 2, margin: '0 0 12px' }}>
        KATMAN DURUMU
      </h3>
      <div style={{ display: 'flex', gap: 12 }}>
        <LayerCard
          icon="🛰️"
          title="GNSS"
          score={physics?.score ?? 1}
          anomaly={physicsAnomaly}
          items={[
            { label: 'SNR Ort.', value: `${gnss?.snr_mean?.toFixed(1) ?? '--'} dB` },
            { label: 'Uydu', value: gnss?.satellite_count ?? '--' },
            { label: 'GDOP', value: gnss?.gdop?.toFixed(2) ?? '--' },
          ]}
        />
        <LayerCard
          icon="📱"
          title="IMU"
          score={stats?.score ?? 1}
          anomaly={statsAnomaly}
          items={[
            { label: 'Hız', value: `${imu?.speed_kmh?.toFixed(1) ?? '--'} km/s` },
            { label: 'Yön', value: `${imu?.heading_deg?.toFixed(1) ?? '--'}°` },
            { label: 'Sıcaklık', value: `${imu?.temperature_c?.toFixed(1) ?? '--'}°C` },
          ]}
        />
        <LayerCard
          icon="🌐"
          title="Referans"
          score={ml?.is_anomaly ? 1 - Math.min(1, Math.abs(ml.anomaly_score)) : 1}
          anomaly={mlAnomaly}
          items={[
            { label: 'NTP Farkı', value: `${ref?.ntp_offset_ms?.toFixed(1) ?? '--'} ms` },
            { label: 'Baz İst.', value: `${ref?.cell_tower_distance_m?.toFixed(0) ?? '--'} m` },
            { label: 'Baro Alt.', value: `${ref?.barometric_altitude_m?.toFixed(1) ?? '--'} m` },
          ]}
        />
      </div>
      {/* Fizik/İstatistik/ML skorları */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        {[
          { label: 'Fizik', score: physics?.score ?? 1, color: '#3b82f6' },
          { label: 'İstatistik', score: stats?.score ?? 1, color: '#8b5cf6' },
          { label: 'ML', score: ml?.is_anomaly ? 0.2 : 1, color: '#10b981' },
        ].map(({ label, score, color }) => (
          <div key={label} style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ fontSize: 10, color }}>{(score * 100).toFixed(0)}%</span>
            </div>
            <ProgressBar value={score} color={color} />
          </div>
        ))}
      </div>
    </div>
  );
}
