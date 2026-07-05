import { describe, it, expect } from 'vitest';
import {
  makeOrbs,
  randomOrb,
  randomPos,
  buildInitialSegments,
  spawnPlayer,
  clampToWorld,
  distance,
  updateSegments,
  turnToward,
  stepPlayer,
  stepFireball,
  fireballOutOfWorld,
  fireballHitPlayer,
  cutSegments,
  orbsFromSegments,
  makeTerrain,
  blockingFeature,
  pushOutOfFeatures,
  zoneSpeedFactor,
  fireballBlockedByTerrain,
  fireballsCollide,
} from './gameLogic';
import type { Fireball, Terrain } from '../src/types/game';
import { GAME_CONFIG } from '../src/types/game';

describe('distance', () => {
  it('returns 0 for identical points', () => {
    expect(distance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });

  it('computes euclidean distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('is symmetric', () => {
    const a = { x: 12, y: -7 };
    const b = { x: -3, y: 22 };
    expect(distance(a, b)).toBeCloseTo(distance(b, a));
  });
});

describe('clampToWorld', () => {
  it('leaves in-bounds positions unchanged', () => {
    expect(clampToWorld({ x: 100, y: 200 })).toEqual({ x: 100, y: 200 });
  });

  it('clamps negative coordinates to 0', () => {
    expect(clampToWorld({ x: -50, y: -1 })).toEqual({ x: 0, y: 0 });
  });

  it('clamps coordinates beyond the world edge', () => {
    expect(clampToWorld({ x: 99999, y: 99999 })).toEqual({
      x: GAME_CONFIG.worldWidth,
      y: GAME_CONFIG.worldHeight,
    });
  });
});

describe('randomOrb', () => {
  it('generates orbs inside the world with a 50px margin', () => {
    for (let i = 0; i < 200; i++) {
      const orb = randomOrb();
      expect(orb.x).toBeGreaterThanOrEqual(50);
      expect(orb.x).toBeLessThanOrEqual(GAME_CONFIG.worldWidth - 50);
      expect(orb.y).toBeGreaterThanOrEqual(50);
      expect(orb.y).toBeLessThanOrEqual(GAME_CONFIG.worldHeight - 50);
      expect([1, 2, 3]).toContain(orb.value);
    }
  });

  it('assigns unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => randomOrb().id));
    expect(ids.size).toBe(100);
  });
});

describe('makeOrbs', () => {
  it('creates exactly orbCount orbs keyed by id', () => {
    const orbs = makeOrbs();
    expect(Object.keys(orbs)).toHaveLength(GAME_CONFIG.orbCount);
    for (const [key, orb] of Object.entries(orbs)) {
      expect(key).toBe(orb.id);
    }
  });
});

describe('randomPos', () => {
  it('stays within the 200px spawn margin', () => {
    for (let i = 0; i < 200; i++) {
      const pos = randomPos();
      expect(pos.x).toBeGreaterThanOrEqual(200);
      expect(pos.x).toBeLessThanOrEqual(GAME_CONFIG.worldWidth - 200);
      expect(pos.y).toBeGreaterThanOrEqual(200);
      expect(pos.y).toBeLessThanOrEqual(GAME_CONFIG.worldHeight - 200);
    }
  });
});

describe('buildInitialSegments', () => {
  it('creates initialSegments segments trailing below the head', () => {
    const head = { x: 500, y: 500 };
    const segments = buildInitialSegments(head);
    expect(segments).toHaveLength(GAME_CONFIG.initialSegments);
    segments.forEach((seg, i) => {
      expect(seg.x).toBe(head.x);
      expect(seg.y).toBe(head.y + (i + 1) * GAME_CONFIG.segmentSpacing);
      expect(seg.angle).toBe(-Math.PI / 2);
    });
  });
});

describe('spawnPlayer', () => {
  it('spawns an alive player with initial size, speed and zero kills', () => {
    const player = spawnPlayer('p1', 'Dragon', 0xff0000);
    expect(player.id).toBe('p1');
    expect(player.name).toBe('Dragon');
    expect(player.color).toBe(0xff0000);
    expect(player.alive).toBe(true);
    expect(player.kills).toBe(0);
    expect(player.size).toBe(GAME_CONFIG.initialSize);
    expect(player.speed).toBe(GAME_CONFIG.speed);
    expect(player.segments).toHaveLength(GAME_CONFIG.initialSegments);
  });
});

describe('turnToward', () => {
  it('reaches the target when within max delta', () => {
    expect(turnToward(0, 0.1, 0.5)).toBeCloseTo(0.1);
  });

  it('clamps the turn to maxDelta', () => {
    expect(turnToward(0, Math.PI / 2, 0.2)).toBeCloseTo(0.2);
    expect(turnToward(0, -Math.PI / 2, 0.2)).toBeCloseTo(-0.2);
  });

  it('takes the short way across the -PI/PI seam', () => {
    // From just below +PI to just above -PI is a tiny clockwise turn, not a full loop
    const next = turnToward(Math.PI - 0.05, -Math.PI + 0.05, 0.5);
    expect(Math.abs(next)).toBeGreaterThan(Math.PI - 0.06);
  });
});

describe('stepPlayer', () => {
  it('always moves forward along its heading', () => {
    const player = spawnPlayer('p1', 'Dragon', 0);
    player.head = { x: 1500, y: 1500 };
    player.angle = 0; // facing +x
    stepPlayer(player, 0, 0.05);
    expect(player.head.x).toBeCloseTo(1500 + GAME_CONFIG.speed * 0.05);
    expect(player.head.y).toBeCloseTo(1500);
  });

  it('turns gradually toward the desired heading', () => {
    const player = spawnPlayer('p1', 'Dragon', 0);
    player.angle = 0;
    stepPlayer(player, Math.PI, 0.05);
    expect(player.angle).toBeCloseTo(GAME_CONFIG.turnRate * 0.05);
    expect(player.angle).toBeLessThan(Math.PI);
  });

  it('stays clamped inside the world', () => {
    const player = spawnPlayer('p1', 'Dragon', 0);
    player.head = { x: GAME_CONFIG.worldWidth - 1, y: 1500 };
    player.angle = 0;
    stepPlayer(player, 0, 1);
    expect(player.head.x).toBeLessThanOrEqual(GAME_CONFIG.worldWidth);
  });
});

describe('fireballs', () => {
  const makeFireball = (x: number, y: number, angle = 0): Fireball => ({
    id: 'f1',
    ownerId: 'shooter',
    x,
    y,
    angle,
  });

  it('stepFireball moves along its angle at fireballSpeed', () => {
    const fb = makeFireball(100, 100, Math.PI / 2); // downward
    stepFireball(fb, 0.1);
    expect(fb.x).toBeCloseTo(100);
    expect(fb.y).toBeCloseTo(100 + GAME_CONFIG.fireballSpeed * 0.1);
  });

  it('fireballOutOfWorld detects world exit', () => {
    expect(fireballOutOfWorld(makeFireball(-1, 500))).toBe(true);
    expect(fireballOutOfWorld(makeFireball(500, GAME_CONFIG.worldHeight + 1))).toBe(true);
    expect(fireballOutOfWorld(makeFireball(500, 500))).toBe(false);
  });

  it('never hits its own shooter', () => {
    const shooter = spawnPlayer('shooter', 'Me', 0);
    const fb = makeFireball(shooter.head.x, shooter.head.y);
    expect(fireballHitPlayer(fb, shooter)).toBeNull();
  });

  it('ignores dead players', () => {
    const victim = spawnPlayer('v1', 'Dead', 0);
    victim.alive = false;
    const fb = makeFireball(victim.head.x, victim.head.y);
    expect(fireballHitPlayer(fb, victim)).toBeNull();
  });

  it('a head hit is a kill', () => {
    const victim = spawnPlayer('v1', 'Victim', 0);
    const fb = makeFireball(victim.head.x, victim.head.y);
    expect(fireballHitPlayer(fb, victim)).toEqual({ kind: 'head' });
  });

  it('a body hit reports the struck segment index', () => {
    const victim = spawnPlayer('v1', 'Victim', 0);
    const target = victim.segments[4];
    // Far enough from the head that only the segment triggers
    const fb = makeFireball(target.x, target.y);
    const hit = fireballHitPlayer(fb, victim);
    expect(hit?.kind).toBe('cut');
    if (hit?.kind === 'cut') {
      expect(hit.segmentIndex).toBeLessThanOrEqual(4);
      expect(hit.segmentIndex).toBeGreaterThan(0);
    }
  });

  it('misses when far away', () => {
    const victim = spawnPlayer('v1', 'Victim', 0);
    const fb = makeFireball(victim.head.x + 1000, victim.head.y + 1000);
    expect(fireballHitPlayer(fb, victim)).toBeNull();
  });
});

describe('cutSegments', () => {
  it('severs the tail from the given index and returns the removed part', () => {
    const player = spawnPlayer('p1', 'Dragon', 0);
    const total = player.segments.length;
    const removed = cutSegments(player, 5);
    expect(player.segments).toHaveLength(5);
    expect(removed).toHaveLength(total - 5);
  });

  it('never shrinks below initial size', () => {
    const player = spawnPlayer('p1', 'Dragon', 0);
    player.size = GAME_CONFIG.initialSize;
    cutSegments(player, 0);
    expect(player.size).toBe(GAME_CONFIG.initialSize);
  });

  it('shrinks a grown dragon in proportion to lost segments', () => {
    const player = spawnPlayer('p1', 'Dragon', 0);
    player.size = 60;
    const removed = cutSegments(player, 2);
    expect(player.size).toBeCloseTo(60 - removed.length * 0.5);
  });
});

describe('orbsFromSegments', () => {
  it('drops an orb every cutOrbEvery segments at the fallen positions', () => {
    const player = spawnPlayer('p1', 'Dragon', 0);
    const removed = cutSegments(player, 0);
    const orbs = orbsFromSegments(removed);
    expect(orbs).toHaveLength(Math.ceil(removed.length / GAME_CONFIG.cutOrbEvery));
    for (const orb of orbs) {
      expect(orb.value).toBe(1);
      expect(orb.x).toBeGreaterThanOrEqual(50);
      expect(orb.y).toBeGreaterThanOrEqual(50);
    }
  });

  it('returns no orbs for an empty cut', () => {
    expect(orbsFromSegments([])).toHaveLength(0);
  });
});

describe('terrain', () => {
  const fixedTerrain: Terrain = {
    features: [
      { id: 't1', kind: 'mountain', x: 1000, y: 1000, radius: 120 },
      { id: 't2', kind: 'rock', x: 2000, y: 2000, radius: 30 },
      { id: 't3', kind: 'tree', x: 500, y: 500, radius: 25 },
    ],
    zones: [
      { kind: 'sea', x: 2500, y: 500, rx: 400, ry: 300 },
      { kind: 'desert', x: 500, y: 2500, rx: 450, ry: 350 },
    ],
  };

  it('makeTerrain generates the configured feature counts inside the world', () => {
    const t = makeTerrain();
    const mountains = t.features.filter((f) => f.kind === 'mountain');
    const rocks = t.features.filter((f) => f.kind === 'rock');
    const trees = t.features.filter((f) => f.kind === 'tree');
    expect(mountains.length).toBeGreaterThan(0);
    expect(mountains.length).toBeLessThanOrEqual(GAME_CONFIG.mountainCount);
    expect(rocks.length).toBeLessThanOrEqual(GAME_CONFIG.rockCount);
    expect(trees.length).toBeLessThanOrEqual(GAME_CONFIG.treeCount);
    for (const f of t.features) {
      expect(f.x - f.radius).toBeGreaterThanOrEqual(0);
      expect(f.x + f.radius).toBeLessThanOrEqual(GAME_CONFIG.worldWidth);
      expect(f.y - f.radius).toBeGreaterThanOrEqual(0);
      expect(f.y + f.radius).toBeLessThanOrEqual(GAME_CONFIG.worldHeight);
    }
    expect(t.zones).toHaveLength(2);
  });

  it('blockingFeature respects the kinds filter (trees do not block movement)', () => {
    const onTree = { x: 500, y: 500 };
    expect(blockingFeature(onTree, 5, fixedTerrain.features, ['mountain', 'rock'])).toBeNull();
    expect(blockingFeature(onTree, 5, fixedTerrain.features, ['tree'])?.id).toBe('t3');
  });

  it('pushOutOfFeatures ejects a position from inside a mountain', () => {
    const inside = { x: 1010, y: 1000 };
    const out = pushOutOfFeatures(inside, 10, fixedTerrain.features);
    const d = distance(out, { x: 1000, y: 1000 });
    expect(d).toBeGreaterThanOrEqual(130); // radius + clearance
  });

  it('pushOutOfFeatures leaves clear positions unchanged', () => {
    const clear = { x: 1500, y: 1500 };
    expect(pushOutOfFeatures(clear, 10, fixedTerrain.features)).toEqual(clear);
  });

  it('zoneSpeedFactor slows dragons in sea and desert', () => {
    expect(zoneSpeedFactor({ x: 2500, y: 500 }, fixedTerrain.zones)).toBe(GAME_CONFIG.seaSlow);
    expect(zoneSpeedFactor({ x: 500, y: 2500 }, fixedTerrain.zones)).toBe(GAME_CONFIG.desertSlow);
    expect(zoneSpeedFactor({ x: 1500, y: 1500 }, fixedTerrain.zones)).toBe(1);
  });

  it('stepPlayer cannot enter a mountain', () => {
    const player = spawnPlayer('p1', 'Dragon', 0);
    player.head = { x: 850, y: 1000 }; // just west of the mountain
    player.angle = 0; // running straight at it
    for (let i = 0; i < 100; i++) stepPlayer(player, 0, 0.05, fixedTerrain);
    const d = distance(player.head, { x: 1000, y: 1000 });
    expect(d).toBeGreaterThanOrEqual(120); // never inside the rock face
  });

  it('fireballBlockedByTerrain stops shots on mountains, rocks AND trees', () => {
    const at = (x: number, y: number): Fireball => ({ id: 'f', ownerId: 'o', x, y, angle: 0 });
    expect(fireballBlockedByTerrain(at(1000, 1000), fixedTerrain.features)).toBe(true);
    expect(fireballBlockedByTerrain(at(2000, 2000), fixedTerrain.features)).toBe(true);
    expect(fireballBlockedByTerrain(at(500, 500), fixedTerrain.features)).toBe(true);
    expect(fireballBlockedByTerrain(at(1500, 1500), fixedTerrain.features)).toBe(false);
  });

  it('fireballsCollide detects near passes', () => {
    const a: Fireball = { id: 'a', ownerId: 'p1', x: 100, y: 100, angle: 0 };
    const b: Fireball = { id: 'b', ownerId: 'p2', x: 100 + GAME_CONFIG.fireballRadius, y: 100, angle: Math.PI };
    const far: Fireball = { id: 'c', ownerId: 'p2', x: 200, y: 200, angle: 0 };
    expect(fireballsCollide(a, b)).toBe(true);
    expect(fireballsCollide(a, far)).toBe(false);
  });

  it('randomPos and randomOrb avoid mountains and rocks', () => {
    for (let i = 0; i < 100; i++) {
      const pos = randomPos(fixedTerrain);
      expect(blockingFeature(pos, 50, fixedTerrain.features, ['mountain', 'rock'])).toBeNull();
      const orb = randomOrb(fixedTerrain);
      expect(blockingFeature(orb, 5, fixedTerrain.features, ['mountain', 'rock'])).toBeNull();
    }
  });
});

describe('updateSegments', () => {
  it('pulls segments toward the head so gaps never exceed spacing', () => {
    const player = spawnPlayer('p1', 'Dragon', 0);
    // Teleport the head far away, then let segments catch up
    player.head = { x: player.head.x + 500, y: player.head.y };
    updateSegments(player);

    let prev = player.head;
    for (const seg of player.segments) {
      expect(distance(prev, seg)).toBeLessThanOrEqual(GAME_CONFIG.segmentSpacing + 1e-9);
      prev = seg;
    }
  });

  it('does not move segments already within spacing', () => {
    const player = spawnPlayer('p1', 'Dragon', 0);
    const before = player.segments.map((s) => ({ x: s.x, y: s.y }));
    updateSegments(player); // head has not moved
    player.segments.forEach((seg, i) => {
      expect(seg.x).toBeCloseTo(before[i].x);
      expect(seg.y).toBeCloseTo(before[i].y);
    });
  });

  it('points each segment at the one ahead of it', () => {
    const player = spawnPlayer('p1', 'Dragon', 0);
    updateSegments(player);
    // Body trails straight down, so every segment should face up (-PI/2)
    for (const seg of player.segments) {
      expect(seg.angle).toBeCloseTo(-Math.PI / 2);
    }
  });
});
