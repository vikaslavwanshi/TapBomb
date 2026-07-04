import type { PlayerState } from '@/types/game';

interface Props {
  me: PlayerState | undefined;
  playerCount: number;
  onRespawn: () => void;
}

export default function HUD({ me, playerCount, onRespawn }: Props) {
  return (
    <div style={styles.container}>
      <div style={styles.left}>
        <span style={styles.stat}>Players: {playerCount}</span>
        {me && (
          <>
            <span style={styles.stat}>Kills: {me.kills}</span>
            <span style={styles.stat}>Size: {Math.round(me.size)}</span>
          </>
        )}
      </div>

      {me && !me.alive && (
        <div style={styles.deathBanner}>
          <p style={styles.deathText}>You were eliminated!</p>
          <button style={styles.respawnBtn} onClick={onRespawn}>Respawn</button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    pointerEvents: 'none',
  },
  left: {
    display: 'flex',
    gap: 16,
    padding: 'calc(10px + var(--safe-top, 0px)) 16px 10px calc(16px + var(--safe-left, 0px))',
    pointerEvents: 'none',
  },
  stat: {
    background: 'rgba(0,0,0,0.55)',
    color: '#00ffcc',
    padding: '4px 10px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    border: '1px solid rgba(0,255,200,0.2)',
  },
  deathBanner: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.65)',
    pointerEvents: 'all',
    zIndex: 150,
  },
  deathText: {
    color: '#ff4444',
    fontSize: 32,
    fontWeight: 700,
    textShadow: '0 0 20px #ff4444',
    marginBottom: 24,
  },
  respawnBtn: {
    padding: '14px 40px',
    background: 'linear-gradient(90deg,#00aaff,#00ffcc)',
    border: 'none',
    borderRadius: 10,
    fontSize: 18,
    fontWeight: 700,
    color: '#000',
    cursor: 'pointer',
  },
};
