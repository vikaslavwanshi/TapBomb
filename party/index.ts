import type * as Party from 'partykit/server';
import type {
  PlayerState,
  ClientMessage,
  ServerMessage,
  Vec2,
  BodySegment,
  Orb,
} from '../src/types/game';
import { GAME_CONFIG, DRAGON_COLORS } from '../src/types/game';

const TICK_MS = 50; // 20 Hz

const playerDirections: Record<string, Vec2> = {};

// ── Orb state (room-level, shared across all connections in a room) ──────────
function makeOrbs(): Record<string, Orb> {
  const orbs: Record<string, Orb> = {};
  for (let i = 0; i < GAME_CONFIG.orbCount; i++) {
    const orb = randomOrb();
    orbs[orb.id] = orb;
  }
  return orbs;
}

export default class TapBombServer implements Party.Server {
  players: Record<string, PlayerState> = {};
  orbs: Record<string, Orb> = makeOrbs();
  connections: Map<string, Party.Connection> = new Map();
  tickInterval: ReturnType<typeof setInterval> | null = null;

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection) {
    this.connections.set(conn.id, conn);
    if (!this.tickInterval) {
      this.tickInterval = setInterval(() => this.tick(), TICK_MS);
    }
  }

  onClose(conn: Party.Connection) {
    this.connections.delete(conn.id);
    delete this.players[conn.id];
    delete playerDirections[conn.id];
    this.broadcast({ type: 'state', players: this.players });
    if (this.connections.size === 0 && this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  onMessage(raw: string, sender: Party.Connection) {
    const msg = JSON.parse(raw) as ClientMessage;

    if (msg.type === 'join') {
      const colorIndex = Object.keys(this.players).length % DRAGON_COLORS.length;
      const player = spawnPlayer(sender.id, msg.name, DRAGON_COLORS[colorIndex]);
      this.players[sender.id] = player;
      playerDirections[sender.id] = { x: 0, y: 0 };

      const welcome: ServerMessage = {
        type: 'welcome',
        id: sender.id,
        players: this.players,
        orbs: this.orbs,
      };
      sender.send(JSON.stringify(welcome));
      this.broadcastExcept(sender.id, { type: 'state', players: this.players });
      return;
    }

    const player = this.players[sender.id];
    if (!player) return;

    if (msg.type === 'move') {
      // Just update direction; movement applied in tick()
      playerDirections[sender.id] = msg.direction;
    }

    if (msg.type === 'tap') {
      const target = this.players[msg.target];
      if (!target || !target.alive || !player.alive || msg.target === sender.id) return;

      const dist = distance(player.head, target.head);
      if (dist > GAME_CONFIG.tapRadius + player.size) return;

      target.alive = false;
      player.kills += 1;
      player.size = Math.min(player.size + GAME_CONFIG.sizeOnKill, GAME_CONFIG.maxSize);

      const lastSeg = player.segments[player.segments.length - 1] ?? player.head;
      for (let i = 0; i < GAME_CONFIG.segmentsOnKill; i++) {
        player.segments.push({ ...lastSeg, angle: 0 });
      }

      this.broadcast({ type: 'explode', victim: target.id, at: { ...target.head } });
      this.broadcast({ type: 'killed', killer: player.id, victim: target.id });
    }

    if (msg.type === 'respawn') {
      player.alive = true;
      player.head = randomPos();
      player.segments = buildInitialSegments(player.head);
      player.size = GAME_CONFIG.initialSize;
      playerDirections[sender.id] = { x: 0, y: 0 };
    }

    if (msg.type === 'chat') {
      const chatMsg: ServerMessage = {
        type: 'chat',
        msg: {
          from: sender.id,
          name: player.name,
          text: msg.text.slice(0, 200),
          ts: Date.now(),
        },
      };
      this.broadcast(chatMsg);
    }
  }

  tick() {
    const dt = TICK_MS / 1000;

    for (const [id, player] of Object.entries(this.players)) {
      if (!player.alive) continue;
      const dir = playerDirections[id] ?? { x: 0, y: 0 };

      if (dir.x !== 0 || dir.y !== 0) {
        player.head = clampToWorld({
          x: player.head.x + dir.x * GAME_CONFIG.speed * dt,
          y: player.head.y + dir.y * GAME_CONFIG.speed * dt,
        });
        updateSegments(player);
      }

      // Orb collision
      const eatR = GAME_CONFIG.orbEatRadius + player.size * 0.3;
      for (const orb of Object.values(this.orbs)) {
        if (distance(player.head, orb) > eatR) continue;

        // Eat it
        const gain = GAME_CONFIG.orbSizeGain[orb.value - 1] ?? 1.5;
        const segGain = GAME_CONFIG.orbSegmentGain[orb.value - 1] ?? 0;
        player.size = Math.min(player.size + gain, GAME_CONFIG.maxSize);
        if (segGain > 0) {
          const last = player.segments[player.segments.length - 1] ?? player.head;
          for (let i = 0; i < segGain; i++) player.segments.push({ ...last, angle: 0 });
        }

        const newOrb = randomOrb();
        delete this.orbs[orb.id];
        this.orbs[newOrb.id] = newOrb;

        this.broadcast({ type: 'orb_eaten', orbId: orb.id, newOrb, eaterId: id });
        break; // one orb per tick per player
      }
    }

    this.broadcast({ type: 'state', players: this.players });
  }

  broadcast(msg: ServerMessage) {
    const payload = JSON.stringify(msg);
    for (const conn of this.connections.values()) {
      conn.send(payload);
    }
  }

  broadcastExcept(excludeId: string, msg: ServerMessage) {
    const payload = JSON.stringify(msg);
    for (const [id, conn] of this.connections.entries()) {
      if (id !== excludeId) conn.send(payload);
    }
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

let orbIdCounter = 0;
function randomOrb(): Orb {
  const roll = Math.random();
  const value: 1 | 2 | 3 = roll < 0.65 ? 1 : roll < 0.9 ? 2 : 3;
  return {
    id: `o${++orbIdCounter}`,
    x: 50 + Math.random() * (GAME_CONFIG.worldWidth - 100),
    y: 50 + Math.random() * (GAME_CONFIG.worldHeight - 100),
    value,
  };
}

function randomPos(): Vec2 {
  return {
    x: 200 + Math.random() * (GAME_CONFIG.worldWidth - 400),
    y: 200 + Math.random() * (GAME_CONFIG.worldHeight - 400),
  };
}

function buildInitialSegments(head: Vec2): BodySegment[] {
  return Array.from({ length: GAME_CONFIG.initialSegments }, (_, i) => ({
    x: head.x,
    y: head.y + (i + 1) * GAME_CONFIG.segmentSpacing,
    angle: -Math.PI / 2,
  }));
}

function spawnPlayer(id: string, name: string, color: number): PlayerState {
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
}

function clampToWorld(pos: Vec2): Vec2 {
  return {
    x: Math.max(0, Math.min(GAME_CONFIG.worldWidth, pos.x)),
    y: Math.max(0, Math.min(GAME_CONFIG.worldHeight, pos.y)),
  };
}

function distance(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function updateSegments(player: PlayerState) {
  const spacing = GAME_CONFIG.segmentSpacing;
  let prev = player.head;
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
}
