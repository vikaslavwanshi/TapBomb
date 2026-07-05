// Pure game-logic helpers shared by the game server and unit tests.
import type {
  PlayerState,
  Vec2,
  BodySegment,
  Orb,
  Fireball,
  Terrain,
  TerrainFeature,
  TerrainKind,
} from '../src/types/game';
import { GAME_CONFIG } from '../src/types/game';

// ── Terrain ───────────────────────────────────────────────────────────────────

const between = ([lo, hi]: [number, number]) => lo + Math.random() * (hi - lo);

// Which feature kinds stop what. Trees are canopy: dragons fly over, fireballs don't.
const MOVEMENT_BLOCKERS: TerrainKind[] = ['mountain', 'rock'];
const FIREBALL_BLOCKERS: TerrainKind[] = ['mountain', 'rock', 'tree'];

export const makeTerrain = (): Terrain => {
  const { worldWidth: W, worldHeight: H } = GAME_CONFIG;

  const zones: Terrain['zones'] = [
    {
      kind: 'sea',
      x: W * (0.15 + Math.random() * 0.7),
      y: H * (0.15 + Math.random() * 0.7),
      rx: 320 + Math.random() * 200,
      ry: 220 + Math.random() * 160,
    },
    {
      kind: 'desert',
      x: W * (0.15 + Math.random() * 0.7),
      y: H * (0.15 + Math.random() * 0.7),
      rx: 360 + Math.random() * 220,
      ry: 260 + Math.random() * 180,
    },
  ];

  const features: TerrainFeature[] = [];
  let featureId = 0;
  const place = (kind: TerrainKind, count: number, radiusRange: [number, number]) => {
    for (let i = 0; i < count; i++) {
      for (let attempt = 0; attempt < 40; attempt++) {
        const radius = between(radiusRange);
        const x = radius + 80 + Math.random() * (W - 2 * (radius + 80));
        const y = radius + 80 + Math.random() * (H - 2 * (radius + 80));
        const crowded = features.some(
          (f) => distance({ x, y }, f) < f.radius + radius + 70,
        );
        if (!crowded) {
          features.push({ id: `t${++featureId}`, kind, x, y, radius });
          break;
        }
      }
    }
  };
  place('mountain', GAME_CONFIG.mountainCount, GAME_CONFIG.mountainRadius);
  place('rock', GAME_CONFIG.rockCount, GAME_CONFIG.rockRadius);
  place('tree', GAME_CONFIG.treeCount, GAME_CONFIG.treeRadius);

  return { features, zones };
};

export const blockingFeature = (
  pos: Vec2,
  clearance: number,
  features: TerrainFeature[],
  kinds: TerrainKind[],
): TerrainFeature | null => {
  for (const f of features) {
    if (!kinds.includes(f.kind)) continue;
    if (distance(pos, f) < f.radius + clearance) return f;
  }
  return null;
};

// Push a position out of any movement-blocking feature it overlaps.
export const pushOutOfFeatures = (
  pos: Vec2,
  clearance: number,
  features: TerrainFeature[],
): Vec2 => {
  let out = pos;
  for (let i = 0; i < 3; i++) {
    const f = blockingFeature(out, clearance, features, MOVEMENT_BLOCKERS);
    if (!f) break;
    const dx = out.x - f.x;
    const dy = out.y - f.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const target = f.radius + clearance + 0.5;
    out = { x: f.x + (dx / d) * target, y: f.y + (dy / d) * target };
  }
  return clampToWorld(out);
};

export const zoneSpeedFactor = (pos: Vec2, zones: Terrain['zones']): number => {
  for (const z of zones) {
    const nx = (pos.x - z.x) / z.rx;
    const ny = (pos.y - z.y) / z.ry;
    if (nx * nx + ny * ny < 1) {
      return z.kind === 'sea' ? GAME_CONFIG.seaSlow : GAME_CONFIG.desertSlow;
    }
  }
  return 1;
};

export const fireballBlockedByTerrain = (fb: Fireball, features: TerrainFeature[]): boolean =>
  blockingFeature({ x: fb.x, y: fb.y }, GAME_CONFIG.fireballRadius, features, FIREBALL_BLOCKERS) !== null;

export const fireballsCollide = (a: Fireball, b: Fireball): boolean =>
  distance(a, b) < GAME_CONFIG.fireballRadius * 2;

// ── Orbs and spawning ─────────────────────────────────────────────────────────

let orbIdCounter = 0;
export const randomOrb = (terrain?: Terrain): Orb => {
  const roll = Math.random();
  const value: 1 | 2 | 3 = roll < 0.65 ? 1 : roll < 0.9 ? 2 : 3;
  let x = 0;
  let y = 0;
  for (let attempt = 0; attempt < 40; attempt++) {
    x = 50 + Math.random() * (GAME_CONFIG.worldWidth - 100);
    y = 50 + Math.random() * (GAME_CONFIG.worldHeight - 100);
    if (!terrain || !blockingFeature({ x, y }, 10, terrain.features, MOVEMENT_BLOCKERS)) break;
  }
  return { id: `o${++orbIdCounter}`, x, y, value };
};

export const makeOrbs = (terrain?: Terrain): Record<string, Orb> => {
  const orbs: Record<string, Orb> = {};
  for (let i = 0; i < GAME_CONFIG.orbCount; i++) {
    const orb = randomOrb(terrain);
    orbs[orb.id] = orb;
  }
  return orbs;
};

export const randomPos = (terrain?: Terrain): Vec2 => {
  for (let attempt = 0; attempt < 60; attempt++) {
    const pos = {
      x: 200 + Math.random() * (GAME_CONFIG.worldWidth - 400),
      y: 200 + Math.random() * (GAME_CONFIG.worldHeight - 400),
    };
    if (!terrain || !blockingFeature(pos, 60, terrain.features, MOVEMENT_BLOCKERS)) return pos;
  }
  return { x: GAME_CONFIG.worldWidth / 2, y: GAME_CONFIG.worldHeight / 2 };
};

export const buildInitialSegments = (head: Vec2): BodySegment[] =>
  Array.from({ length: GAME_CONFIG.initialSegments }, (_, i) => ({
    x: head.x,
    y: head.y + (i + 1) * GAME_CONFIG.segmentSpacing,
    angle: -Math.PI / 2,
  }));

export const spawnPlayer = (
  id: string,
  name: string,
  color: number,
  terrain?: Terrain,
): PlayerState => {
  const head = randomPos(terrain);
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
// Zones (sea/desert) slow the run; mountains and rocks are impassable.
export const stepPlayer = (
  player: PlayerState,
  desiredAngle: number,
  dt: number,
  terrain?: Terrain,
): void => {
  player.angle = turnToward(player.angle, desiredAngle, GAME_CONFIG.turnRate * dt);
  const speed = player.speed * (terrain ? zoneSpeedFactor(player.head, terrain.zones) : 1);
  let next = clampToWorld({
    x: player.head.x + Math.cos(player.angle) * speed * dt,
    y: player.head.y + Math.sin(player.angle) * speed * dt,
  });
  if (terrain) next = pushOutOfFeatures(next, player.size * 0.4, terrain.features);
  player.head = next;
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
