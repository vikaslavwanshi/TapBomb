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
} from './gameLogic';
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
