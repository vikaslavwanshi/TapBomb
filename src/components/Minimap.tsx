import { useEffect, useRef } from 'react';
import type { PlayerState, Orb } from '@/types/game';
import { GAME_CONFIG } from '@/types/game';

interface Props {
  players: Record<string, PlayerState>;
  orbs: Record<string, Orb>;
  myId: string;
}

const MAP_W = 160;
const MAP_H = 160;
const SCALE_X = MAP_W / GAME_CONFIG.worldWidth;
const SCALE_Y = MAP_H / GAME_CONFIG.worldHeight;

export default function Minimap({ players, orbs, myId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, MAP_W, MAP_H);

    // Background
    ctx.fillStyle = 'rgba(6,10,26,0.85)';
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    // World border
    ctx.strokeStyle = 'rgba(0,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, MAP_W - 1, MAP_H - 1);

    // Grid lines (faint)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < MAP_W; x += MAP_W / 6) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_H); ctx.stroke();
    }
    for (let y = 0; y < MAP_H; y += MAP_H / 6) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_W, y); ctx.stroke();
    }

    // Orbs (tiny dots, batched by value)
    for (const orb of Object.values(orbs)) {
      const mx = orb.x * SCALE_X;
      const my = orb.y * SCALE_Y;
      const r = orb.value === 1 ? 1 : orb.value === 2 ? 1.5 : 2;
      ctx.fillStyle = orb.value === 1 ? '#44ffaa' : orb.value === 2 ? '#ffdd44' : '#ff6622';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Other players
    for (const [id, p] of Object.entries(players)) {
      if (!p.alive || id === myId) continue;
      const mx = p.head.x * SCALE_X;
      const my = p.head.y * SCALE_Y;
      const color = `#${p.color.toString(16).padStart(6, '0')}`;

      // Body trail
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1.5;
      if (p.segments.length > 0) {
        ctx.beginPath();
        ctx.moveTo(mx, my);
        for (const seg of p.segments.slice(0, 8)) {
          ctx.lineTo(seg.x * SCALE_X, seg.y * SCALE_Y);
        }
        ctx.stroke();
      }

      // Head dot
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(mx, my, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // My player — always on top, bright
    const me = players[myId];
    if (me?.alive) {
      const mx = me.head.x * SCALE_X;
      const my2 = me.head.y * SCALE_Y;

      // Pulse ring
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(mx, my2, 6, 0, Math.PI * 2);
      ctx.stroke();

      // Head dot
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#00ffff';
      ctx.beginPath();
      ctx.arc(mx, my2, 4, 0, Math.PI * 2);
      ctx.fill();

      // View indicator arrow (direction of movement)
      if (me.segments.length > 0) {
        const dx = me.head.x - me.segments[0].x;
        const dy = me.head.y - me.segments[0].y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          ctx.strokeStyle = '#00ffff';
          ctx.globalAlpha = 0.7;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mx, my2);
          ctx.lineTo(mx + (dx / len) * 7, my2 + (dy / len) * 7);
          ctx.stroke();
        }
      }
    }

    ctx.globalAlpha = 1;
  });

  return (
    <div style={styles.container}>
      <canvas
        ref={canvasRef}
        width={MAP_W}
        height={MAP_H}
        style={styles.canvas}
      />
      <div style={styles.label}>MAP</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 'calc(16px + var(--safe-bottom, 0px))',
    right: 'calc(12px + var(--safe-right, 0px))',
    zIndex: 100,
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid rgba(0,255,255,0.2)',
    boxShadow: '0 0 16px rgba(0,0,0,0.6)',
  },
  canvas: {
    display: 'block',
  },
  label: {
    position: 'absolute',
    top: 4,
    left: 6,
    fontSize: 9,
    color: 'rgba(0,255,255,0.5)',
    letterSpacing: 1.5,
    fontWeight: 700,
    pointerEvents: 'none',
  },
};
