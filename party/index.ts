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
  Orb,
  Fireball,
} from '../src/types/game';
import { GAME_CONFIG, DRAGON_COLORS } from '../src/types/game';
import {
  makeOrbs,
  randomOrb,
  randomPos,
  buildInitialSegments,
  spawnPlayer,
  stepPlayer,
  stepFireball,
  fireballOutOfWorld,
  fireballHitPlayer,
  cutSegments,
  orbsFromSegments,
  distance,
} from './gameLogic';

const TICK_MS = 50; // 20 Hz

// Durable Object class — one instance per game room. The `Main` binding in
// wrangler.toml maps this to the /parties/main/:room URL the client uses.
export class TapBombServer extends Server {
  players: Record<string, PlayerState> = {};
  orbs: Record<string, Orb> = makeOrbs();
  fireballs: Record<string, Fireball> = {};
  fireballExpiry: Record<string, number> = {};
  desiredAngles: Record<string, number> = {};
  lastFireAt: Record<string, number> = {};
  fireballCounter = 0;
  tickInterval: ReturnType<typeof setInterval> | null = null;

  onConnect() {
    if (!this.tickInterval) {
      this.tickInterval = setInterval(() => this.tick(), TICK_MS);
    }
  }

  onClose(conn: Connection) {
    delete this.players[conn.id];
    delete this.desiredAngles[conn.id];
    delete this.lastFireAt[conn.id];
    this.broadcastMsg({ type: 'state', players: this.players, fireballs: this.fireballs });

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
      this.desiredAngles[sender.id] = player.angle;

      const welcome: ServerMessage = {
        type: 'welcome',
        id: sender.id,
        players: this.players,
        orbs: this.orbs,
      };
      sender.send(JSON.stringify(welcome));
      this.broadcastMsg({ type: 'state', players: this.players, fireballs: this.fireballs }, sender.id);
      return;
    }

    const player = this.players[sender.id];
    if (!player) return;

    if (msg.type === 'move') {
      // Zero vector means "keep current heading" — dragons never stop running
      const { x, y } = msg.direction;
      if (x !== 0 || y !== 0) {
        this.desiredAngles[sender.id] = Math.atan2(y, x);
      }
    }

    if (msg.type === 'fire') {
      if (!player.alive) return;
      const now = Date.now();
      if (now - (this.lastFireAt[sender.id] ?? 0) < GAME_CONFIG.fireCooldownMs) return;
      this.lastFireAt[sender.id] = now;

      const muzzle = player.size + GAME_CONFIG.fireballRadius + 4;
      const fb: Fireball = {
        id: `f${++this.fireballCounter}`,
        ownerId: sender.id,
        x: player.head.x + Math.cos(player.angle) * muzzle,
        y: player.head.y + Math.sin(player.angle) * muzzle,
        angle: player.angle,
      };
      this.fireballs[fb.id] = fb;
      this.fireballExpiry[fb.id] = now + GAME_CONFIG.fireballLifeMs;
      this.broadcastMsg({ type: 'fireball', fireball: fb });
    }

    if (msg.type === 'respawn') {
      player.alive = true;
      player.head = randomPos();
      player.angle = Math.random() * Math.PI * 2;
      player.segments = buildInitialSegments(player.head);
      player.size = GAME_CONFIG.initialSize;
      this.desiredAngles[sender.id] = player.angle;
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
    const now = Date.now();

    for (const [id, player] of Object.entries(this.players)) {
      if (!player.alive) continue;

      // Dragons always run; input only steers
      stepPlayer(player, this.desiredAngles[id] ?? player.angle, dt);

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

    // Fireballs: fly, expire, and resolve hits
    for (const fb of Object.values(this.fireballs)) {
      stepFireball(fb, dt);

      if (now > (this.fireballExpiry[fb.id] ?? 0) || fireballOutOfWorld(fb)) {
        this.removeFireball(fb.id);
        continue;
      }

      for (const victim of Object.values(this.players)) {
        const hit = fireballHitPlayer(fb, victim);
        if (!hit) continue;

        const shooter = this.players[fb.ownerId];

        if (hit.kind === 'head') {
          victim.alive = false;
          if (shooter?.alive) {
            shooter.kills += 1;
            shooter.size = Math.min(shooter.size + GAME_CONFIG.sizeOnKill, GAME_CONFIG.maxSize);
            const lastSeg = shooter.segments[shooter.segments.length - 1] ?? shooter.head;
            for (let i = 0; i < GAME_CONFIG.segmentsOnKill; i++) {
              shooter.segments.push({ ...lastSeg, angle: 0 });
            }
          }
          this.broadcastMsg({ type: 'explode', victim: victim.id, at: { ...victim.head } });
          this.broadcastMsg({ type: 'killed', killer: fb.ownerId, victim: victim.id });
        } else {
          const removed = cutSegments(victim, hit.segmentIndex);
          const dropped = orbsFromSegments(removed);
          for (const orb of dropped) this.orbs[orb.id] = orb;
          this.broadcastMsg({
            type: 'cut',
            victim: victim.id,
            attacker: fb.ownerId,
            at: { x: fb.x, y: fb.y },
            segmentsLost: removed.length,
          });
          if (dropped.length > 0) this.broadcastMsg({ type: 'orbs_added', orbs: dropped });
        }

        this.removeFireball(fb.id);
        break; // fireball is spent on first hit
      }
    }

    this.broadcastMsg({ type: 'state', players: this.players, fireballs: this.fireballs });
  }

  removeFireball(id: string) {
    delete this.fireballs[id];
    delete this.fireballExpiry[id];
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
