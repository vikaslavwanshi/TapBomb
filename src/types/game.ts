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
  segments: BodySegment[];
  size: number;       // base radius of head, grows on kill
  speed: number;
  alive: boolean;
  kills: number;
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
  | { type: 'move';   direction: Vec2 }
  | { type: 'tap';    target: PlayerId }
  | { type: 'chat';   text: string }
  | { type: 'respawn' };

// Messages sent server → client
export type ServerMessage =
  | { type: 'state';     players: Record<PlayerId, PlayerState> }
  | { type: 'killed';    killer: PlayerId; victim: PlayerId }
  | { type: 'explode';   victim: PlayerId; at: Vec2 }
  | { type: 'chat';      msg: ChatMessage }
  | { type: 'welcome';   id: PlayerId; players: Record<PlayerId, PlayerState>; orbs: Record<string, Orb> }
  | { type: 'orb_eaten'; orbId: string; newOrb: Orb; eaterId: PlayerId };

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
  tapRadius: 80,
  speed: 160,
  orbCount: 220,
  orbEatRadius: 24,           // px — how close head must be to eat an orb
  orbSizeGain: [1.5, 3, 6],   // size added per orb value 1/2/3
  orbSegmentGain: [0, 1, 2],  // segments added per orb value
};
