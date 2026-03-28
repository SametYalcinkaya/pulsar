import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const ATTACK_COLORS = {
  SAFE: '#10b981',
  WARNING: '#f59e0b',
  THREAT: '#ef4444',
  CRITICAL: '#dc2626',
};

const ATTACK_BADGES = {
  JAMMING: { label: 'JAMMING', color: '#ef4444' },
  SPOOFING: { label: 'SPOOFING', color: '#dc2626' },
  MEACONING: { label: 'MEACONING', color: '#f59e0b' },
  COMBINED: { label: 'BİRLEŞİK', color: '#7c3aed' },
  SAFE: { label: 'SAFE', color: '#10b981' },
};

export default function TrustGauge({ score = 96, threatLevel = 'SAFE', attackType = null }) {
  const color = ATTACK_COLORS[threatLevel] || '#10b981';
  const badge = ATTACK_BADGES[attackType || 'SAFE'];
  const isThreat = threatLevel !== 'SAFE';

  const chartData = [{ value: score, fill: color }];

  return (
    <div className="card trust-gauge-card" style={{ textAlign: 'center', position: 'relative' }}>
      <motion.div
        animate={isThreat ? {
          boxShadow: [`0 0 0px ${color}`, `0 0 30px ${color}`, `0 0 0px ${color}`],
        } : { boxShadow: 'none' }}
        transition={{ duration: 1.2, repeat: Infinity }}
        style={{ borderRadius: 16, padding: 4 }}
      >
        <h3 style={{ color: 'var(--text-muted)', margin: '0 0 8px', fontSize: 12, letterSpacing: 2 }}>
          GÜVEN SKORU
        </h3>

        <div style={{ position: 'relative', display: 'inline-block' }}>
          <RadialBarChart
            width={200}
            height={200}
            cx={100}
            cy={100}
            innerRadius={65}
            outerRadius={90}
            startAngle={210}
            endAngle={-30}
            data={chartData}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              background={{ fill: 'rgba(255,255,255,0.05)' }}
              dataKey="value"
              cornerRadius={8}
              angleAxisId={0}
            />
          </RadialBarChart>

          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}>
            <motion.div
              key={Math.round(score)}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ fontSize: 36, fontWeight: 700, color, lineHeight: 1 }}
            >
              {Math.round(score)}
            </motion.div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ 100</div>
          </div>
        </div>

        <motion.div
          key={threatLevel}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: 8,
            fontSize: 18,
            fontWeight: 700,
            color,
            letterSpacing: 3,
          }}
        >
          {threatLevel}
        </motion.div>

        <AnimatePresence>
          {badge && (
            <motion.div
              key={badge.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                display: 'inline-block',
                marginTop: 8,
                padding: '4px 12px',
                borderRadius: 20,
                background: `${badge.color}22`,
                border: `1px solid ${badge.color}`,
                color: badge.color,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 1,
              }}
            >
              {badge.label}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
