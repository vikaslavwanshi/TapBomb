import {
  Server,
  routePartykitRequest,
  type Connection,
  type WSMessage,
} from 'partyserver';
import type {
  PlayerState,
  ClientMessage,
  ServerMessage,
  Vec2,
  Orb,
} from '../src/types/game';
import { GAME_CONFIG, DRAGON_COLORS } from '../src/types/game';
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

const TICK_MS = 50; // 20 Hz

// Durable Object class — one instance per game room. The `Main` binding in
// wrangler.toml maps this to the /parties/main/:room URL the client uses.
export class TapBombServer extends Server {
  players: Record<string, PlayerState> = {};
  orbs: Record<string, Orb> = makeOrbs();
  directions: Record<string, Vec2> = {};
  tickInterval: ReturnType<typeof setInterval> | null = null;

  onConnect() {
    if (!this.tickInterval) {
      this.tickInterval = setInterval(() => this.tick(), TICK_MS);
    }
  }

  onClose(conn: Connection) {
    delete this.players[conn.id];
    delete this.directions[conn.id];
    this.broadcastMsg({ type: 'state', players: this.players });

    let remaining = 0;
    for (const _ of this.getConnections()) remaining++;
    if (remaining === 0 && this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  onMessage(sender: Connection, raw: WSMessage) {
    if (typeof raw !== 'string') return;

    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw) as ClientMessage;
    } catch {
      return; // ignore malformed messages
    }

    if (msg.type === 'join') {
      const colorIndex = Object.keys(this.players).length % DRAGON_COLORS.length;
      const player = spawnPlayer(sender.id, msg.name, DRAGON_COLORS[colorIndex]);
      this.players[sender.id] = player;
      this.directions[sender.id] = { x: 0, y: 0 };

      const welcome: ServerMessage = {
        type: 'welcome',
        id: sender.id,
        players: this.players,
        orbs: this.orbs,
      };
      sender.send(JSON.stringify(welcome));
      this.broadcastMsg({ type: 'state', players: this.players }, sender.id);
      return;
    }

    const player = this.players[sender.id];
    if (!player) return;

    if (msg.type === 'move') {
      // Just update direction; movement applied in tick()
      this.directions[sender.id] = msg.direction;
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

      this.broadcastMsg({ type: 'explode', victim: target.id, at: { ...target.head } });
      this.broadcastMsg({ type: 'killed', killer: player.id, victim: target.id });
    }

    if (msg.type === 'respawn') {
      player.alive = true;
      player.head = randomPos();
      player.segments = buildInitialSegments(player.head);
      player.size = GAME_CONFIG.initialSize;
      this.directions[sender.id] = { x: 0, y: 0 };
    }

    if (msg.type === 'chat') {
      this.broadcastMsg({
        type: 'chat',
        msg: {
          from: sender.id,
          name: player.name,
          text: msg.text.slice(0, 200),
          ts: Date.now(),
        },
      });
    }
  }

  tick() {
    const dt = TICK_MS / 1000;

    for (const [id, player] of Object.entries(this.players)) {
      if (!player.alive) continue;
      const dir = this.directions[id] ?? { x: 0, y: 0 };

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

        this.broadcastMsg({ type: 'orb_eaten', orbId: orb.id, newOrb, eaterId: id });
        break; // one orb per tick per player
      }
    }

    this.broadcastMsg({ type: 'state', players: this.players });
  }

  broadcastMsg(msg: ServerMessage, excludeId?: string) {
    this.broadcast(JSON.stringify(msg), excludeId ? [excludeId] : undefined);
  }
}

type Env = {
  Main: DurableObjectNamespace<TapBombServer>;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const response = await routePartykitRequest(request, env as never);
      return response ?? new Response('Not found', { status: 404 });
    } catch (err) {
      console.error('Routing error:', err);
      return new Response('Internal error', { status: 500 });
    }
  },
};
