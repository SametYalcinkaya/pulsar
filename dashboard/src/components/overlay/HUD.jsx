import HUDTrustGauge from './HUDTrustGauge';
import HUDMetrics from './HUDMetrics';
import HUDAttackControls from './HUDAttackControls';
import HUDAttackStatus from './HUDAttackStatus';

export default function HUD({ satState, connectionStatus }) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: 20,
      fontFamily: 'var(--heading)',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Top-left: Logo + Trust Gauge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 16px',
            background: 'rgba(0,0,0,0.7)',
            borderRadius: 12,
            border: '1px solid rgba(124,210,233,0.15)',
            backdropFilter: 'blur(10px)',
          }}>
            <span style={{
              fontSize: 18, fontWeight: 800, letterSpacing: 4, color: '#38bdf8',
              textShadow: '0 0 15px rgba(56,189,248,0.5)',
            }}>
              PULSAR
            </span>
            <span style={{ fontSize: 9, color: '#9aa7c7' }}>3D SİMÜLASYON</span>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: connectionStatus === 'connected' ? '#22c55e' : '#ef4444',
              boxShadow: connectionStatus === 'connected' ? '0 0 6px #22c55e' : '0 0 6px #ef4444',
            }} />
          </div>
          <HUDTrustGauge
            trustScore={satState.trustScore}
            threatLevel={satState.threatLevel}
          />
          <div style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: 'var(--mono)',
            background: 'rgba(0,0,0,0.5)',
            padding: '2px 8px',
            borderRadius: 6,
          }}>
            Tick #{satState.tick}
          </div>
        </div>

        {/* Top-right: Attack status */}
        <HUDAttackStatus attackType={satState.attackType} />
      </div>

      {/* Bottom row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        pointerEvents: 'auto',
      }}>
        {/* Bottom-left: Metrics */}
        <HUDMetrics satState={satState} />

        {/* Bottom-center: Legend */}
        <div style={{
          display: 'flex',
          gap: 16,
          padding: '6px 14px',
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 10,
          fontSize: 9,
          color: '#9aa7c7',
        }}>
          <span><span style={{ color: '#22c55e' }}>●</span> Normal sinyal</span>
          <span><span style={{ color: '#f59e0b' }}>●</span> Zayıf sinyal</span>
          <span><span style={{ color: '#ef4444' }}>●</span> Kritik / Kayıp</span>
          <span><span style={{ color: '#38bdf8' }}>◯</span> GNSS konum</span>
          <span><span style={{ color: '#22c55e' }}>◯</span> IMU konum</span>
        </div>

        {/* Bottom-right: Attack controls */}
        <HUDAttackControls activeAttack={satState.attackType} />
      </div>
    </div>
  );
}
