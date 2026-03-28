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
import SimulationView from './SimulationView';
import AssistantView from './AssistantView';

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
  const [viewMode, setViewMode] = useState('3d');

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

        {/* View Toggle */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(14,116,144,0.15)',
          borderRadius: 999,
          border: '1px solid rgba(14,116,144,0.4)',
          overflow: 'hidden',
        }}>
          <button
            onClick={() => setViewMode('dashboard')}
            style={{
              padding: '7px 16px',
              fontSize: 11,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: viewMode === 'dashboard' ? 'rgba(56,189,248,0.25)' : 'transparent',
              color: viewMode === 'dashboard' ? '#38bdf8' : '#7c889e',
              transition: 'all 0.2s',
              letterSpacing: 1,
            }}
          >
            DASHBOARD
          </button>
          <button
            onClick={() => setViewMode('3d')}
            style={{
              padding: '7px 16px',
              fontSize: 11,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: viewMode === '3d' ? 'rgba(56,189,248,0.25)' : 'transparent',
              color: viewMode === '3d' ? '#38bdf8' : '#7c889e',
              transition: 'all 0.2s',
              letterSpacing: 1,
            }}
          >
            3D SİMÜLASYON
          </button>
          <button
            onClick={() => setViewMode('assistant')}
            style={{
              padding: '7px 16px',
              fontSize: 11,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: viewMode === 'assistant' ? 'rgba(56,189,248,0.25)' : 'transparent',
              color: viewMode === 'assistant' ? '#38bdf8' : '#7c889e',
              transition: 'all 0.2s',
              letterSpacing: 1,
            }}
          >
            AI ASISTAN
          </button>
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

      {/* 3D Simulation View */}
      {viewMode === '3d' && (
        <SimulationView data={data} connectionStatus={connectionStatus} />
      )}

      {/* AI Assistant View */}
      {viewMode === 'assistant' && (
        <AssistantView data={data} connectionStatus={connectionStatus} />
      )}

      {/* Dashboard View */}
      {viewMode === 'dashboard' && (
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
      )}
    </div>
  );
}
