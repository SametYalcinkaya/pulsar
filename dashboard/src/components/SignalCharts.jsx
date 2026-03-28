import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';

const CHARTS = [
  {
    key: 'snr',
    label: 'SNR (dB)',
    dataKey: d => d?.gnss?.snr_mean ?? 0,
    color: '#3b82f6',
    refLine: { value: 25, label: 'Min', color: '#ef4444' },
    domain: [0, 50],
  },
  {
    key: 'pos_discrepancy',
    label: 'Konum Sapması (m)',
    dataKey: d => {
      const gnss = d?.gnss;
      const dr = d?.imu?.dead_reckoning;
      if (!gnss || !dr) return 0;
      const dlat = (gnss.latitude - dr.latitude) * 111320;
      const dlon = (gnss.longitude - dr.longitude) * 111320 * Math.cos(gnss.latitude * Math.PI / 180);
      return Math.sqrt(dlat * dlat + dlon * dlon);
    },
    color: '#f59e0b',
    refLine: { value: 15, label: 'Eşik', color: '#ef4444' },
    domain: [0, 200],
  },
  {
    key: 'ntp_offset',
    label: 'NTP Farkı (ms)',
    dataKey: d => Math.abs(d?.reference?.ntp_offset_ms ?? 0),
    color: '#10b981',
    refLine: { value: 200, label: 'Şüpheli', color: '#f59e0b' },
    domain: [0, 1000],
  },
  {
    key: 'gdop',
    label: 'GDOP',
    dataKey: d => d?.gnss?.gdop ?? 0,
    color: '#8b5cf6',
    refLine: { value: 6, label: 'Kötü', color: '#ef4444' },
    domain: [0, 20],
  },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '6px 10px', fontSize: 12,
    }}>
      <p style={{ color: 'var(--text-muted)', margin: 0 }}>Tick {label}</p>
      <p style={{ color: payload[0].color, margin: 0, fontWeight: 600 }}>
        {payload[0].value?.toFixed(2)}
      </p>
    </div>
  );
};

export default function SignalCharts({ history = [], isAttackActive = false }) {
  const chartData = history.map((d, i) => ({
    tick: d.tick,
    ...CHARTS.reduce((acc, c) => ({ ...acc, [c.key]: c.dataKey(d) }), {}),
  }));

  return (
    <div className="card" style={{ position: 'relative' }}>
      {isAttackActive && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 16,
          background: 'rgba(239,68,68,0.04)',
          border: '1px solid rgba(239,68,68,0.3)',
          pointerEvents: 'none', zIndex: 1,
        }} />
      )}
      <h3 style={{ color: 'var(--text-muted)', fontSize: 12, letterSpacing: 2, margin: '0 0 16px' }}>
        CANLI SİNYAL GRAFİKLERİ
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {CHARTS.map(chart => (
          <div key={chart.key}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 4px' }}>
              {chart.label}
            </p>
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="tick" tick={false} axisLine={false} tickLine={false} />
                <YAxis domain={chart.domain} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                {chart.refLine && (
                  <ReferenceLine
                    y={chart.refLine.value}
                    stroke={chart.refLine.color}
                    strokeDasharray="4 2"
                    label={{ value: chart.refLine.label, fill: chart.refLine.color, fontSize: 9 }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey={chart.key}
                  stroke={chart.color}
                  dot={false}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
}
