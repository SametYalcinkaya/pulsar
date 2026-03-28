export default function HUDMetrics({ satState }) {
  const metrics = [
    {
      label: 'Uydu',
      value: satState.satelliteCount,
      unit: '/12',
      color: satState.satelliteCount >= 8 ? '#22c55e' : satState.satelliteCount >= 5 ? '#f59e0b' : '#ef4444',
    },
    {
      label: 'SNR',
      value: satState.snrMean.toFixed(1),
      unit: 'dB',
      color: satState.snrMean >= 35 ? '#22c55e' : satState.snrMean >= 20 ? '#f59e0b' : '#ef4444',
    },
    {
      label: 'Sapma',
      value: satState.positionDrift < 1 ? '<1' : Math.round(satState.positionDrift),
      unit: 'm',
      color: satState.positionDrift < 15 ? '#22c55e' : satState.positionDrift < 50 ? '#f59e0b' : '#ef4444',
    },
    {
      label: 'GDOP',
      value: satState.gdop.toFixed(1),
      unit: '',
      color: satState.gdop < 4 ? '#22c55e' : satState.gdop < 6 ? '#f59e0b' : '#ef4444',
    },
    {
      label: 'NTP',
      value: satState.ntpOffset < 1 ? '<1' : Math.round(satState.ntpOffset),
      unit: 'ms',
      color: satState.ntpOffset < 200 ? '#22c55e' : satState.ntpOffset < 1000 ? '#f59e0b' : '#ef4444',
    },
  ];

  return (
    <div style={{
      display: 'flex',
      gap: 12,
      padding: '8px 12px',
      background: 'rgba(0,0,0,0.7)',
      borderRadius: 12,
      border: '1px solid rgba(124,210,233,0.15)',
      backdropFilter: 'blur(10px)',
    }}>
      {metrics.map((m) => (
        <div key={m.label} style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: 52,
        }}>
          <span style={{
            fontSize: 9,
            color: 'var(--text-muted)',
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}>
            {m.label}
          </span>
          <span style={{
            fontSize: 16,
            fontWeight: 700,
            fontFamily: 'var(--mono)',
            color: m.color,
            textShadow: `0 0 8px ${m.color}40`,
          }}>
            {m.value}
            <span style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-muted)' }}>
              {m.unit}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
