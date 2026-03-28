import { useState, useRef, useCallback, useEffect } from 'react';

const WAKE_WORDS = ['pulsar', 'jarvis'];

export function useVoiceCommands({ onCommand } = {}) {
  const [status, setStatus] = useState('idle'); // idle | listening | wakeword | processing | speaking | error
  const [transcript, setTranscript] = useState('');
  const [isSilentMode, setIsSilentMode] = useState(false);
  const [wakeWordDetected, setWakeWordDetected] = useState(false);

  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const wakeTimerRef = useRef(null);
  const continuousRef = useRef(false);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const speak = useCallback((text, onEnd) => {
    if (!synthRef.current || isSilentMode) {
      onEnd?.();
      return;
    }
    synthRef.current.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'tr-TR';
    utter.rate = 0.9;
    utter.pitch = 1.0;
    utter.volume = 1;

    const setVoice = () => {
      const voices = synthRef.current.getVoices();
      const preferred =
        voices.find(v => v.lang.startsWith('tr') && v.name.toLowerCase().includes('google')) ||
        voices.find(v => v.lang.startsWith('tr') && v.name.toLowerCase().includes('microsoft')) ||
        voices.find(v => v.lang.startsWith('tr')) ||
        voices[0];
      if (preferred) utter.voice = preferred;
    };

    if (speechSynthesis.getVoices().length > 0) setVoice();
    else speechSynthesis.addEventListener('voiceschanged', setVoice, { once: true });

    utter.onstart = () => setStatus('speaking');
    utter.onend = () => {
      setStatus(continuousRef.current ? 'listening' : 'idle');
      onEnd?.();
    };
    utter.onerror = () => {
      setStatus(continuousRef.current ? 'listening' : 'idle');
      onEnd?.();
    };

    synthRef.current.speak(utter);
  }, [isSilentMode]);

  const processCommand = useCallback((rawTranscript) => {
    setTranscript(rawTranscript);
    setStatus('processing');
    setWakeWordDetected(false);

    // Strip wake words
    let cmd = rawTranscript.toLowerCase();
    WAKE_WORDS.forEach(w => { cmd = cmd.replace(w, '').trim(); });

    // Send to parent for AI processing
    if (onCommand) {
      onCommand(cmd);
    }
    setStatus('listening');
  }, [onCommand]);

  const startListening = useCallback(() => {
    if (continuousRef.current) return;

    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechAPI) return;

    const rec = new SpeechAPI();
    rec.lang = 'tr-TR';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    recognitionRef.current = rec;
    continuousRef.current = true;

    rec.onstart = () => setStatus('listening');

    rec.onresult = (event) => {
      const latest = event.results[event.results.length - 1];
      const isFinal = latest.isFinal;
      const text = Array.from(latest)
        .map(r => r.transcript)
        .join(' ')
        .toLowerCase()
        .trim();

      setTranscript(text);

      const hasWake = WAKE_WORDS.some(w => text.includes(w));

      if (hasWake && !wakeWordDetected) {
        setWakeWordDetected(true);
        setStatus('wakeword');
        speak('Evet efendim? Komutunuzu bekliyorum.');
        if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current);
        wakeTimerRef.current = setTimeout(() => {
          setWakeWordDetected(false);
          setStatus('listening');
        }, 5000);
      }

      if (isFinal && wakeWordDetected) {
        if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current);
        processCommand(text);
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        continuousRef.current = false;
        setStatus('error');
      }
    };

    rec.onend = () => {
      if (continuousRef.current) {
        try { rec.start(); } catch {}
      } else {
        setStatus('idle');
      }
    };

    try { rec.start(); } catch { setStatus('error'); }
  }, [wakeWordDetected, processCommand, speak]);

  const stopListening = useCallback(() => {
    continuousRef.current = false;
    if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current);
    recognitionRef.current?.stop();
    synthRef.current?.cancel();
    setStatus('idle');
    setWakeWordDetected(false);
    setTranscript('');
  }, []);

  const toggleListening = useCallback(() => {
    if (status === 'idle' || status === 'error') startListening();
    else stopListening();
  }, [status, startListening, stopListening]);

  return {
    status,
    transcript,
    isSilentMode,
    wakeWordDetected,
    toggleListening,
    speak,
    setIsSilentMode,
  };
}
