// Procedural audio — no asset files needed. All sounds synthesised via Web Audio API.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  // Resume if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// ── Primitive builders ────────────────────────────────────────────────────────

function osc(
  ac: AudioContext,
  type: OscillatorType,
  freq: number,
  startTime: number,
  duration: number,
  gainStart: number,
  gainEnd: number,
): void {
  const g = ac.createGain();
  g.gain.setValueAtTime(gainStart, startTime);
  g.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.0001), startTime + duration);
  g.connect(ac.destination);

  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, startTime);
  o.connect(g);
  o.start(startTime);
  o.stop(startTime + duration);
}

function noise(ac: AudioContext, startTime: number, duration: number, gain: number): void {
  const bufSize = ac.sampleRate * duration;
  const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buf;

  const g = ac.createGain();
  g.gain.setValueAtTime(gain, startTime);
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 400;
  filter.Q.value = 0.5;

  src.connect(filter);
  filter.connect(g);
  g.connect(ac.destination);
  src.start(startTime);
  src.stop(startTime + duration);
}

// ── Public sound functions ────────────────────────────────────────────────────

export function playExplosion(volume = 1) {
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    noise(ac, t, 0.6, 0.7 * volume);
    osc(ac, 'sine', 80, t, 0.4, 0.5 * volume, 0);
    osc(ac, 'sine', 40, t + 0.05, 0.5, 0.3 * volume, 0);
  } catch { /* audio blocked */ }
}

export function playEatOrb(value: 1 | 2 | 3) {
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    const freq = value === 1 ? 660 : value === 2 ? 880 : 1100;
    const gain = value === 1 ? 0.12 : value === 2 ? 0.18 : 0.25;
    osc(ac, 'sine', freq, t, 0.1, gain, 0);
    if (value === 3) osc(ac, 'sine', freq * 1.5, t + 0.03, 0.12, 0.12, 0);
  } catch { /* audio blocked */ }
}

export function playKill() {
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    // Rising triumphant tone
    osc(ac, 'square', 220, t, 0.12, 0.2, 0.01);
    osc(ac, 'square', 330, t + 0.1, 0.12, 0.2, 0.01);
    osc(ac, 'square', 440, t + 0.2, 0.2, 0.25, 0.01);
    noise(ac, t, 0.15, 0.1);
  } catch { /* audio blocked */ }
}

export function playDeath() {
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    // Descending doom
    osc(ac, 'sawtooth', 300, t, 0.6, 0.25, 0);
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.6);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + 0.7);
  } catch { /* audio blocked */ }
}

export function unlockAudio() {
  // Call on first user gesture to satisfy browser autoplay policy
  try { getCtx(); } catch { /* ignore */ }
}
