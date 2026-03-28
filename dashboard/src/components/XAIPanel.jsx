import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import EvidenceReportModal from './EvidenceReportModal';

const API = 'http://localhost:8000';

const toAscii = (text = '') => text
  .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
  .replace(/ı/g, 'i').replace(/İ/g, 'I')
  .replace(/ş/g, 's').replace(/Ş/g, 'S')
  .replace(/ö/g, 'o').replace(/Ö/g, 'O')
  .replace(/ü/g, 'u').replace(/Ü/g, 'U')
  .replace(/ç/g, 'c').replace(/Ç/g, 'C');

function TypewriterText({ text, speed = 18 }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      setDisplayed(text.slice(0, ++i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text]);
  return <span>{displayed}</span>;
}

export default function XAIPanel({ data, selectedEvidenceId }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const evidenceId = selectedEvidenceId || data?.xai_evidence_id;
  const summary = data?.xai_summary;
  const threatLevel = data?.threat_level;
  const isAlarm = threatLevel && threatLevel !== 'SAFE';

  useEffect(() => {
    if (isAlarm) setOpen(true);
    else setOpen(false);
  }, [isAlarm]);

  useEffect(() => {
    if (!evidenceId) return;
    axios.get(`${API}/api/explain/${evidenceId}`)
      .then(r => setDetail(r.data))
      .catch(() => { });
  }, [evidenceId]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const shapData = detail?.shap_top_features?.slice(0, 5).map(f => ({
    name: f.name,
    value: Math.abs(f.value),
    label: f.description?.slice(0, 40) + '...',
  })) ?? [];

  const downloadEvidence = async () => {
    if (!evidenceId) return;
    const { data: pkg } = await axios.get(`${API}/api/evidence/${evidenceId}`);
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${evidenceId}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const buildPdf = async () => {
    if (!evidenceId) return;
    setPdfLoading(true);
    try {
      const { data: pkg } = await axios.get(`${API}/api/evidence/${evidenceId}`);
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      let y = 40;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('PULSAR Evidence Report', margin, y);
      y += 18;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Evidence ID: ${pkg.evidence_id}`, margin, y + 12);
      doc.text(`Timestamp: ${pkg.timestamp_utc}`, margin, y + 26);
      doc.text(`Attack Type: ${pkg.attack_type}`, margin, y + 40);
      y += 60;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Summary', margin, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const summaryText = toAscii(pkg.human_readable_explanation || 'No summary available.');
      const summaryLines = doc.splitTextToSize(summaryText, pageWidth - margin * 2);
      doc.text(summaryLines, margin, y);
      y += summaryLines.length * 12 + 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Scores', margin, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Trust Score Before: ${pkg.trust_score_before}`, margin, y);
      doc.text(`Trust Score After: ${pkg.trust_score_after}`, margin, y + 14);
      doc.text(`Duration (s): ${pkg.duration_seconds}`, margin, y + 28);
      y += 48;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Violations', margin, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const violations = [
        ...(pkg.physics_violations || []).map(v => `Physics: ${toAscii(v)}`),
        ...(pkg.stats_violations || []).map(v => `Stats: ${toAscii(v)}`),
      ];
      const violationLines = doc.splitTextToSize(violations.join('\n') || 'None', pageWidth - margin * 2);
      doc.text(violationLines, margin, y);
      y += violationLines.length * 12 + 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Top SHAP Features', margin, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const shap = (pkg.shap_top_features || []).map((f) => `${f.name}: ${toAscii(f.description || '')}`);
      const shapLines = doc.splitTextToSize(shap.join('\n') || 'None', pageWidth - margin * 2);
      doc.text(shapLines, margin, y);

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(url);
      setPdfOpen(true);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          className="card"
          style={{ borderColor: '#ef444466' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ color: '#ef4444', fontSize: 13, fontWeight: 700, margin: 0 }}>
              🔍 Neden Alarm Verdi?
            </h3>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}
            >✕</button>
          </div>

          {evidenceId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                {evidenceId}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(evidenceId)}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11 }}
              >📋</button>
              <button
                onClick={downloadEvidence}
                style={{
                  marginLeft: 'auto', padding: '4px 10px', borderRadius: 6,
                  background: 'rgba(59,130,246,0.15)', border: '1px solid var(--accent)',
                  color: 'var(--accent)', cursor: 'pointer', fontSize: 11,
                }}
              >JSON</button>
              <button
                onClick={buildPdf}
                disabled={pdfLoading}
                style={{
                  padding: '4px 10px', borderRadius: 6,
                  background: 'rgba(14,116,144,0.2)', border: '1px solid rgba(14,116,144,0.6)',
                  color: '#38bdf8', cursor: 'pointer', fontSize: 11,
                }}
              >{pdfLoading ? 'PDF...' : 'PDF'}</button>
            </div>
          )}

          {summary && (
            <p style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 12 }}>
              <TypewriterText text={summary} />
            </p>
          )}

          {shapData.length > 0 && (
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 6px' }}>
                SHAP — En Etkili Özellikler
              </p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={shapData} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} width={120} />
                  <Tooltip
                    formatter={(v, _, p) => [v.toFixed(3), p.payload.label]}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 11 }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {shapData.map((_, i) => (
                      <Cell key={i} fill={`hsl(${220 + i * 20}, 80%, 60%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      )}
      <EvidenceReportModal
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        pdfUrl={pdfUrl}
        evidenceId={evidenceId}
      />
    </AnimatePresence>
  );
}
