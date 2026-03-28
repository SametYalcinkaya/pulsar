import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import PulsarCore from './components/assistant/PulsarCore';
import { useVoiceCommands } from './hooks/useVoiceCommands';

const API = 'http://localhost:8000';

export default function AssistantView({ data, connectionStatus }) {
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: 'P.U.L.S.A.R sistem başlatıldı. Tüm modüller çevrimiçi. Size nasıl yardımcı olabilirim efendim?',
      sender: 'pulsar',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef(null);

  // Derived state from real data
  const trustScore = data?.trust_score ?? 96;
  const threatLevel = data?.threat_level ?? 'SAFE';
  const activeAttack = data?.active_attack ?? null;
  const gnss = data?.gnss || {};
  const imu = data?.imu || {};

  // Map threat level to PulsarCore status
  const coreStatus = threatLevel === 'CRITICAL' || threatLevel === 'THREAT'
    ? 'ATTACK'
    : threatLevel === 'WARNING' ? 'WARNING' : 'SECURE';

  // Send message to backend
  const sendToAPI = useCallback(async (text) => {
    setIsThinking(true);
    try {
      const res = await axios.post(`${API}/api/chat`, { message: text });
      return res.data.response;
    } catch (e) {
      console.error('Chat API error:', e);
      return 'Bağlantı hatası efendim. Backend ile iletişim kurulamadı.';
    } finally {
      setIsThinking(false);
    }
  }, []);

  // Handle sending a message
  const sendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (!text) return;

    const userMsg = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    const response = await sendToAPI(text);

    const pulsarMsg = {
      id: (Date.now() + 1).toString(),
      text: response,
      sender: 'pulsar',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, pulsarMsg]);
    voice.speak(response);
  }, [inputValue, sendToAPI]);

  // Voice command handler
  const handleVoiceCommand = useCallback(async (cmd) => {
    if (!cmd || cmd.length < 2) return;

    const userMsg = {
      id: Date.now().toString(),
      text: `🎤 ${cmd}`,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    const response = await sendToAPI(cmd);

    const pulsarMsg = {
      id: (Date.now() + 1).toString(),
      text: response,
      sender: 'pulsar',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, pulsarMsg]);
    voice.speak(response);
  }, [sendToAPI]);

  const voice = useVoiceCommands({ onCommand: handleVoiceCommand });

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Score color
  const scoreColor = trustScore >= 80 ? '#22c55e' : trustScore >= 50 ? '#f59e0b' : '#ef4444';
  const scoreLabel = trustScore >= 80 ? 'STABİL' : trustScore >= 50 ? 'DİKKAT' : 'KRİTİK';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '280px 1fr 300px',
      gap: 16,
      height: 'calc(100vh - 70px)',
    }}>
      {/* SOL PANEL — Sistem Metrikleri */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Trust Score */}
        <Panel title="GÜVEN SKORU">
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <motion.div
              key={trustScore}
              initial={{ scale: 1.3, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ fontSize: 42, fontWeight: 800, color: scoreColor, fontFamily: 'var(--mono)', textShadow: `0 0 20px ${scoreColor}` }}
            >
              {Math.round(trustScore)}
            </motion.div>
            <div style={{ fontSize: 10, color: scoreColor, letterSpacing: 3, fontWeight: 700 }}>{scoreLabel}</div>
            <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
              <div style={{ height: '100%', borderRadius: 4, width: `${trustScore}%`, background: scoreColor, boxShadow: `0 0 8px ${scoreColor}`, transition: 'width 0.8s ease' }} />
            </div>
          </div>
        </Panel>

        {/* GNSS Durumu */}
        <Panel title="GNSS MONİTÖR" alert={!!activeAttack}>
          <MetricRow label="Uydu" value={gnss.satellite_count ?? 12} color={gnss.satellite_count >= 8 ? '#22c55e' : '#ef4444'} />
          <MetricRow label="SNR" value={`${(gnss.snr_mean ?? 40).toFixed(1)} dB`} color={gnss.snr_mean >= 35 ? '#22c55e' : gnss.snr_mean >= 20 ? '#f59e0b' : '#ef4444'} />
          <MetricRow label="GDOP" value={(gnss.gdop ?? 2.2).toFixed(1)} color={gnss.gdop < 6 ? '#22c55e' : '#ef4444'} />
          <MetricRow label="Konum" value={`${(gnss.latitude ?? 41.008).toFixed(4)}°N`} color="#38bdf8" />
          {activeAttack && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ marginTop: 8, padding: '6px 10px', borderRadius: 4, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', textAlign: 'center' }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', letterSpacing: 2 }}>
                ⚠ {activeAttack} SALDIRISI
              </span>
            </motion.div>
          )}
        </Panel>

        {/* Ses Kontrolü */}
        <Panel title="SES KONTROL">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <button
              onClick={voice.toggleListening}
              style={{
                width: 52, height: 52, borderRadius: '50%',
                border: `2px solid ${voice.status !== 'idle' && voice.status !== 'error' ? '#38bdf8' : 'rgba(56,189,248,0.2)'}`,
                background: voice.status !== 'idle' && voice.status !== 'error' ? 'rgba(56,189,248,0.1)' : 'transparent',
                color: voice.status !== 'idle' && voice.status !== 'error' ? '#38bdf8' : '#475569',
                cursor: 'pointer', fontSize: 20,
                boxShadow: voice.status === 'listening' ? '0 0 15px rgba(56,189,248,0.4)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              🎤
            </button>
            <span style={{ fontSize: 9, color: '#9aa7c7', letterSpacing: 2 }}>
              {voice.status === 'listening' ? 'DİNLİYOR...' :
               voice.status === 'wakeword' ? 'KOMUT BEKLİYOR' :
               voice.status === 'speaking' ? 'KONUŞUYOR' :
               voice.status === 'processing' ? 'İŞLİYOR' :
               'MİKROFON KAPALI'}
            </span>
            {voice.transcript && (
              <div style={{ fontSize: 9, color: 'rgba(56,189,248,0.5)', textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                "{voice.transcript}"
              </div>
            )}
            <div style={{ fontSize: 8, color: '#475569', textAlign: 'center', lineHeight: 1.4 }}>
              "PULSAR" veya "JARVIS" diyerek başlatın
            </div>
          </div>
        </Panel>
      </div>

      {/* ORTA — PulsarCore + Chat */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {/* PulsarCore Canvas */}
        <PulsarCore status={coreStatus} isSpeaking={voice.status === 'speaking'} size={280} />

        {/* Chat mesajları */}
        <div style={{
          flex: 1, width: '100%', maxWidth: 640,
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 10,
          padding: '0 8px',
        }}>
          {messages.slice(-12).map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <span style={{ fontSize: 8, color: msg.sender === 'user' ? '#9aa7c7' : 'rgba(56,189,248,0.5)', marginBottom: 2, fontFamily: 'var(--mono)' }}>
                {msg.sender === 'user' ? 'SEN' : 'PULSAR'} // {msg.timestamp.toLocaleTimeString('tr-TR')}
              </span>
              <div style={{
                fontSize: 12, padding: '8px 12px', maxWidth: '85%', lineHeight: 1.5,
                borderRadius: 8,
                background: msg.sender === 'user' ? 'rgba(56,189,248,0.08)' : 'rgba(6,14,30,0.8)',
                border: `1px solid ${msg.sender === 'user' ? 'rgba(56,189,248,0.15)' : 'rgba(56,189,248,0.08)'}`,
                color: msg.sender === 'user' ? '#e5e7eb' : 'rgba(56,189,248,0.8)',
              }}>
                {msg.text}
              </div>
            </motion.div>
          ))}

          {isThinking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ padding: '8px 12px', background: 'rgba(6,14,30,0.8)', border: '1px solid rgba(56,189,248,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: '#9aa7c7', letterSpacing: 2 }}>DÜŞÜNÜYORUM</span>
                <ThinkingDots />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          width: '100%', maxWidth: 640,
          display: 'flex', gap: 10,
          padding: '12px 16px',
          background: 'rgba(17,24,39,0.8)',
          border: '1px solid rgba(124,210,233,0.12)',
          borderRadius: 12,
          backdropFilter: 'blur(12px)',
        }}>
          <input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Komut girin..."
            style={{
              flex: 1, height: 36, padding: '0 12px',
              background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(124,210,233,0.12)',
              borderRadius: 6, color: '#e5e7eb', fontSize: 13,
              fontFamily: 'var(--mono)', outline: 'none',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim()}
            style={{
              height: 36, padding: '0 20px',
              background: inputValue.trim() ? '#38bdf8' : 'rgba(56,189,248,0.2)',
              color: '#000', border: 'none', borderRadius: 6,
              fontSize: 11, fontWeight: 700, letterSpacing: 2, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            GÖNDER
          </button>
        </div>
      </div>

      {/* SAĞ PANEL — Komutlar + Bilgi */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Panel title="SES KOMUTLARI">
          <CommandRow cmd='"PULSAR, merhaba"' desc="Karşılama" />
          <CommandRow cmd='"PULSAR, sistem durumu"' desc="Durum raporu" />
          <CommandRow cmd='"PULSAR, saldırı ne?"' desc="Saldırı bilgisi" />
          <CommandRow cmd='"PULSAR, tavsiye ver"' desc="Güvenlik önerisi" />
          <CommandRow cmd='"PULSAR, XAI açıkla"' desc="Tespit açıklaması" />
          <CommandRow cmd='"PULSAR, kanıt bilgisi"' desc="Evidence bilgisi" />
          <CommandRow cmd='"PULSAR, sessiz mod"' desc="Sesi kapat/aç" />
          <CommandRow cmd='"PULSAR, komutlar"' desc="Komut listesi" />
        </Panel>

        <Panel title="DİYALOG GEÇMİŞİ">
          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {messages.slice(-8).map((msg) => (
              <div key={msg.id} style={{ fontSize: 9, color: msg.sender === 'user' ? '#9aa7c7' : 'rgba(56,189,248,0.4)', lineHeight: 1.4, fontFamily: 'var(--mono)' }}>
                <span style={{ color: '#475569' }}>{msg.sender === 'user' ? 'USR' : 'PLR'}</span> {msg.text.substring(0, 60)}{msg.text.length > 60 ? '...' : ''}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="HAKKINDA">
          <div style={{ fontSize: 9, color: '#9aa7c7', lineHeight: 1.6 }}>
            <p><strong style={{ color: '#38bdf8' }}>PULSAR</strong> — Protective Unified Layer for Signal Assurance & Resilience</p>
            <p style={{ marginTop: 6 }}>Yapay zeka destekli GNSS güvenlik asistanı. Saldırı tespiti, XAI açıklamaları ve güvenlik tavsiyeleri sağlar.</p>
            <p style={{ marginTop: 6, color: '#475569' }}>Sesli veya metin komutları ile etkileşim kurabilirsiniz.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// Helper Components
function Panel({ title, children, alert }) {
  return (
    <div style={{
      background: 'rgba(17,24,39,0.7)',
      border: `1px solid ${alert ? 'rgba(239,68,68,0.4)' : 'rgba(124,210,233,0.12)'}`,
      borderRadius: 8,
      padding: '12px 14px',
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: alert ? '#ef4444' : '#38bdf8',
        letterSpacing: 2, marginBottom: 10,
        paddingBottom: 6, borderBottom: '1px solid rgba(124,210,233,0.08)',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function MetricRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
      <span style={{ fontSize: 10, color: '#9aa7c7' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'var(--mono)' }}>{value}</span>
    </div>
  );
}

function CommandRow({ cmd, desc }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
      <span style={{ fontSize: 9, color: 'rgba(56,189,248,0.6)' }}>{cmd}</span>
      <span style={{ fontSize: 9, color: '#475569', fontStyle: 'italic' }}>{desc}</span>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.16 }}
          style={{ width: 5, height: 5, borderRadius: '50%', background: '#38bdf8' }}
        />
      ))}
    </div>
  );
}
