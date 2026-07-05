// Pure game-logic helpers shared by the game server and unit tests.
import type { PlayerState, Vec2, BodySegment, Orb, Fireball } from '../src/types/game';
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
    angle: Math.random() * Math.PI * 2,
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

// Rotate `current` toward `desired` by at most `maxDelta` radians, taking the
// shortest way around the circle. Returns the new heading in (-PI, PI].
export const turnToward = (current: number, desired: number, maxDelta: number): number => {
  let diff = desired - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const clamped = Math.max(-maxDelta, Math.min(maxDelta, diff));
  let next = current + clamped;
  while (next > Math.PI) next -= Math.PI * 2;
  while (next <= -Math.PI) next += Math.PI * 2;
  return next;
};

// Advance a dragon one tick: steer toward desiredAngle, then run forward.
export const stepPlayer = (player: PlayerState, desiredAngle: number, dt: number): void => {
  player.angle = turnToward(player.angle, desiredAngle, GAME_CONFIG.turnRate * dt);
  player.head = clampToWorld({
    x: player.head.x + Math.cos(player.angle) * player.speed * dt,
    y: player.head.y + Math.sin(player.angle) * player.speed * dt,
  });
  updateSegments(player);
};

export const stepFireball = (fb: Fireball, dt: number): void => {
  fb.x += Math.cos(fb.angle) * GAME_CONFIG.fireballSpeed * dt;
  fb.y += Math.sin(fb.angle) * GAME_CONFIG.fireballSpeed * dt;
};

export const fireballOutOfWorld = (fb: Fireball): boolean =>
  fb.x < 0 || fb.y < 0 || fb.x > GAME_CONFIG.worldWidth || fb.y > GAME_CONFIG.worldHeight;

// Where (if anywhere) a fireball strikes a dragon this tick.
// 'head' kills; a segment index means the tail is severed from there.
export type FireballHit = { kind: 'head' } | { kind: 'cut'; segmentIndex: number } | null;

export const fireballHitPlayer = (fb: Fireball, player: PlayerState): FireballHit => {
  if (!player.alive || fb.ownerId === player.id) return null;

  const fbPos = { x: fb.x, y: fb.y };
  if (distance(fbPos, player.head) < player.size + GAME_CONFIG.fireballRadius) {
    return { kind: 'head' };
  }

  const segRadius = player.size * 0.7 + GAME_CONFIG.fireballRadius;
  for (let i = 0; i < player.segments.length; i++) {
    if (distance(fbPos, player.segments[i]) < segRadius) {
      return { kind: 'cut', segmentIndex: i };
    }
  }
  return null;
};

// Sever the tail from segmentIndex onward. Returns the removed segments so the
// caller can turn them into food orbs. Shrinks the dragon slightly per lost
// segment, never below initial size.
export const cutSegments = (player: PlayerState, segmentIndex: number): BodySegment[] => {
  const removed = player.segments.splice(segmentIndex);
  player.size = Math.max(
    GAME_CONFIG.initialSize,
    player.size - removed.length * 0.5,
  );
  return removed;
};

// Food orbs dropped where a severed tail fell (every Nth segment, capped).
export const orbsFromSegments = (segments: BodySegment[]): Orb[] => {
  const orbs: Orb[] = [];
  for (let i = 0; i < segments.length; i += GAME_CONFIG.cutOrbEvery) {
    const seg = segments[i];
    orbs.push({
      id: `o${++orbIdCounter}`,
      x: Math.max(50, Math.min(GAME_CONFIG.worldWidth - 50, seg.x)),
      y: Math.max(50, Math.min(GAME_CONFIG.worldHeight - 50, seg.y)),
      value: 1,
    });
  }
  return orbs;
};

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
