// Pure game-logic helpers shared by the PartyKit server and unit tests.
import type { PlayerState, Vec2, BodySegment, Orb } from '../src/types/game';
import { GAME_CONFIG } from '../src/types/game';

let orbIdCounter = 0;
export const randomOrb = (): Orb => {
  const roll = Math.random();
  const value: 1 | 2 | 3 = roll < 0.65 ? 1 : roll < 0.9 ? 2 : 3;
  return {
    id: `o${++orbIdCounter}`,
    x: 50 + Math.random() * (GAME_CONFIG.worldWidth - 100),
    y: 50 + Math.random() * (GAME_CONFIG.worldHeight - 100),
    value,
  };
};

export const makeOrbs = (): Record<string, Orb> => {
  const orbs: Record<string, Orb> = {};
  for (let i = 0; i < GAME_CONFIG.orbCount; i++) {
    const orb = randomOrb();
    orbs[orb.id] = orb;
  }
  return orbs;
};

export const randomPos = (): Vec2 => ({
  x: 200 + Math.random() * (GAME_CONFIG.worldWidth - 400),
  y: 200 + Math.random() * (GAME_CONFIG.worldHeight - 400),
});

export const buildInitialSegments = (head: Vec2): BodySegment[] =>
  Array.from({ length: GAME_CONFIG.initialSegments }, (_, i) => ({
    x: head.x,
    y: head.y + (i + 1) * GAME_CONFIG.segmentSpacing,
    angle: -Math.PI / 2,
  }));

export const spawnPlayer = (id: string, name: string, color: number): PlayerState => {
  const head = randomPos();
  return {
    id,
    name,
    color,
    head,
    segments: buildInitialSegments(head),
    size: GAME_CONFIG.initialSize,
    speed: GAME_CONFIG.speed,
    alive: true,
    kills: 0,
  };
};

export const clampToWorld = (pos: Vec2): Vec2 => ({
  x: Math.max(0, Math.min(GAME_CONFIG.worldWidth, pos.x)),
  y: Math.max(0, Math.min(GAME_CONFIG.worldHeight, pos.y)),
});

export const distance = (a: Vec2, b: Vec2): number =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

export const updateSegments = (player: PlayerState): void => {
  const spacing = GAME_CONFIG.segmentSpacing;
  let prev: Vec2 = player.head;
  for (const seg of player.segments) {
    const dx = seg.x - prev.x;
    const dy = seg.y - prev.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > spacing) {
      const ratio = (dist - spacing) / dist;
      seg.x -= dx * ratio;
      seg.y -= dy * ratio;
    }
    seg.angle = Math.atan2(prev.y - seg.y, prev.x - seg.x);
    prev = seg;
  }
};
