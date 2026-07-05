export type PlayerId = string;

export interface Vec2 {
  x: number;
  y: number;
}

export interface BodySegment extends Vec2 {
  angle: number;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  color: number;
  head: Vec2;
  angle: number;      // heading in radians — dragons always run forward along this
  segments: BodySegment[];
  size: number;       // base radius of head, grows on kill
  speed: number;
  alive: boolean;
  kills: number;
}

export interface Fireball {
  id: string;
  ownerId: PlayerId;
  x: number;
  y: number;
  angle: number; // travel direction, fixed at launch
}

export interface Orb {
  id: string;
  x: number;
  y: number;
  value: 1 | 2 | 3; // small / medium / large — affects size gain and visual
}

export interface ChatMessage {
  from: PlayerId;
  name: string;
  text: string;
  ts: number;
}

// Messages sent client → server
export type ClientMessage =
  | { type: 'join';   name: string }
  | { type: 'move';   direction: Vec2 } // desired heading; zero vector = keep current heading
  | { type: 'fire' }
  | { type: 'chat';   text: string }
  | { type: 'respawn' };

// Messages sent server → client
export type ServerMessage =
  | { type: 'state';      players: Record<PlayerId, PlayerState>; fireballs: Record<string, Fireball> }
  | { type: 'killed';     killer: PlayerId; victim: PlayerId }
  | { type: 'explode';    victim: PlayerId; at: Vec2 }
  | { type: 'fireball';   fireball: Fireball }
  | { type: 'cut';        victim: PlayerId; attacker: PlayerId; at: Vec2; segmentsLost: number }
  | { type: 'orbs_added'; orbs: Orb[] }
  | { type: 'chat';       msg: ChatMessage }
  | { type: 'welcome';    id: PlayerId; players: Record<PlayerId, PlayerState>; orbs: Record<string, Orb> }
  | { type: 'orb_eaten';  orbId: string; newOrb: Orb; eaterId: PlayerId };

export const DRAGON_COLORS = [
  0xe74c3c, // red
  0x3498db, // blue
  0x2ecc71, // green
  0xf39c12, // orange
  0x9b59b6, // purple
  0x1abc9c, // teal
  0xe91e8c, // pink
  0xf1c40f, // yellow
];

export const GAME_CONFIG = {
  worldWidth: 3000,
  worldHeight: 3000,
  initialSize: 28,
  sizeOnKill: 8,
  maxSize: 120,
  segmentSpacing: 18,
  segmentsOnKill: 6,
  initialSegments: 12,
  speed: 160,
  turnRate: 3.4,          // rad/s — max steering rate while auto-running
  fireballSpeed: 520,     // px/s
  fireballRadius: 11,     // px — collision radius of the projectile
  fireballLifeMs: 1600,   // despawn after this long without hitting anything
  fireCooldownMs: 650,    // min delay between shots per player
  cutOrbEvery: 2,         // severed segments drop a food orb every N segments
  orbCount: 220,
  orbEatRadius: 24,           // px — how close head must be to eat an orb
  orbSizeGain: [1.5, 3, 6],   // size added per orb value 1/2/3
  orbSegmentGain: [0, 1, 2],  // segments added per orb value
};
