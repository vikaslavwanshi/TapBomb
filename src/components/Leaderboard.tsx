import type { PlayerState } from '@/types/game';
import { GAME_CONFIG } from '@/types/game';

interface Props {
  players: Record<string, PlayerState>;
  myId: string;
}

export default function Leaderboard({ players, myId }: Props) {
  const sorted = Object.values(players)
    .sort((a, b) => b.kills - a.kills || b.size - a.size)
    .slice(0, 8);

  if (sorted.length === 0) return null;

  return (
    <div style={styles.container}>
      <div style={styles.title}>🏆 Leaderboard</div>
      {sorted.map((p, i) => {
        const isMe = p.id === myId;
        const sizePercent = Math.round(((p.size - GAME_CONFIG.initialSize) / (GAME_CONFIG.maxSize - GAME_CONFIG.initialSize)) * 100);
        return (
          <div key={p.id} style={{ ...styles.row, ...(isMe ? styles.myRow : {}) }}>
            <span style={styles.rank}>
              {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </span>
            <span style={{ ...styles.dot, backgroundColor: `#${p.color.toString(16).padStart(6, '0')}` }} />
            <span style={styles.name}>{p.name}{!p.alive ? ' 💀' : ''}</span>
            <span style={styles.kills}>{p.kills}⚡</span>
            <div style={styles.barWrap}>
              <div style={{ ...styles.bar, width: `${Math.max(4, sizePercent)}%`, backgroundColor: `#${p.color.toString(16).padStart(6, '0')}` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 'calc(52px + var(--safe-top, 0px))',
    right: 'calc(12px + var(--safe-right, 0px))',
    width: 220,
    background: 'rgba(6,10,26,0.82)',
    border: '1px solid rgba(0,255,255,0.18)',
    borderRadius: 10,
    padding: '10px 12px',
    zIndex: 100,
    backdropFilter: 'blur(6px)',
  },
  title: {
    color: '#00ffcc',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
    opacity: 0.9,
  },
  myRow: {
    opacity: 1,
    background: 'rgba(0,255,200,0.07)',
    borderRadius: 4,
    padding: '1px 2px',
  },
  rank: {
    fontSize: 11,
    width: 24,
    textAlign: 'center' as const,
    color: '#aaa',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  name: {
    flex: 1,
    fontSize: 12,
    color: '#ddeeff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  kills: {
    fontSize: 11,
    color: '#ffcc00',
    fontWeight: 700,
    minWidth: 28,
    textAlign: 'right' as const,
  },
  barWrap: {
    width: 36,
    height: 4,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    flexShrink: 0,
  },
  bar: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
};
