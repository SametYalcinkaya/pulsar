import { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import TrustGauge from './components/TrustGauge';
import SignalCharts from './components/SignalCharts';
import LayerStatus from './components/LayerStatus';
import AttackControls from './components/AttackControls';
import XAIPanel from './components/XAIPanel';
import AlertLog from './components/AlertLog';
import SimulationPanel from './components/SimulationPanel';
import MetricGlossary from './components/MetricGlossary';

function StatusDot({ status }) {
  const colors = { connected: '#10b981', connecting: '#f59e0b', disconnected: '#ef4444' };
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8,
      borderRadius: '50%', background: colors[status] || '#64748b',
      marginRight: 6,
      boxShadow: status === 'connected' ? `0 0 6px ${colors.connected}` : 'none',
    }} />
  );
}

export default function App() {
  const { data, history, connectionStatus } = useWebSocket();
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(null);

  const tick = data?.tick ?? 0;
  const trustScore = data?.trust_score ?? 96;
  const threatLevel = data?.threat_level ?? 'SAFE';
  const attackType = data?.attack_type ?? null;
  const activeAttack = data?.active_attack ?? null;
  const isAttackActive = !!activeAttack;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16, padding: '12px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4, color: 'var(--accent)' }}>
            PULSAR
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            GNSS Saldırı Tespit Sistemi
          </span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 12px', borderRadius: 999,
          background: 'rgba(14,116,144,0.2)', border: '1px solid rgba(14,116,144,0.6)',
          fontSize: 11, color: '#38bdf8',
        }}>
          Demo Modu: Sentetik GNSS
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tick #{tick}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            <StatusDot status={connectionStatus} />
            {connectionStatus === 'connected' ? 'Bağlı' :
              connectionStatus === 'connecting' ? 'Bağlanıyor...' : 'Bağlantı Kesildi'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {new Date().toLocaleTimeString('tr-TR')}
          </span>
        </div>
      </div>

      {/* Ana Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr 300px',
        gap: 16,
        alignItems: 'start',
      }}>
        {/* Sol sütun */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SimulationPanel data={data} />
          <TrustGauge score={trustScore} threatLevel={threatLevel} attackType={attackType} />
          <XAIPanel data={data} selectedEvidenceId={selectedEvidenceId} />
        </div>

        {/* Orta sütun */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SignalCharts history={history} isAttackActive={isAttackActive} />
          <LayerStatus data={data} />
        </div>

        {/* Sağ sütun */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AttackControls activeAttack={activeAttack} />
          <MetricGlossary />
          <AlertLog
            onSelectEvidence={setSelectedEvidenceId}
            selectedEvidenceId={selectedEvidenceId}
          />
        </div>
      </div>
    </div>
  );
}
