import { useState } from 'react';

interface Props {
  onJoin: (name: string, room: string) => void;
}

export default function LobbyScreen({ onJoin }: Props) {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('arena-1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onJoin(name.trim(), room.trim() || 'arena-1');
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h1 style={styles.title}>🐉 TapBomb</h1>
        <p style={styles.subtitle}>Steer your dragon. SPACE to breathe fire. Sever tails, explode heads.</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            placeholder="Your dragon name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <input
            style={styles.input}
            placeholder="Room (e.g. arena-1)"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            maxLength={30}
          />
          <button style={styles.button} type="submit" disabled={!name.trim()}>
            Enter Arena
          </button>
        </form>
        <p style={styles.hint}>
          Share the same room name with friends to play together.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'linear-gradient(135deg, #0a0a1a 0%, #0d1b3e 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(0,255,255,0.25)',
    borderRadius: 16,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 380,
    textAlign: 'center',
    boxShadow: '0 0 40px rgba(0,255,255,0.12)',
  },
  title: {
    margin: '0 0 6px',
    fontSize: 42,
    color: '#00ffff',
    textShadow: '0 0 20px #00ffff88',
    letterSpacing: 2,
  },
  subtitle: {
    margin: '0 0 28px',
    color: '#8899bb',
    fontSize: 14,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid rgba(0,255,255,0.3)',
    background: 'rgba(0,0,0,0.4)',
    color: '#fff',
    fontSize: 16,
    outline: 'none',
  },
  button: {
    marginTop: 8,
    padding: '14px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(90deg, #00aaff, #00ffcc)',
    color: '#000',
    fontWeight: 700,
    fontSize: 16,
    cursor: 'pointer',
    letterSpacing: 1,
  },
  hint: {
    marginTop: 20,
    color: '#445566',
    fontSize: 12,
  },
};
