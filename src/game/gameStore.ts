// Module-level bridge so React can pass socket/callbacks into Phaser scenes
// without relying on scene.init() timing or @ts-expect-error hacks.
export const gameStore = {
  socket: null as WebSocket | null,
  myId: '',
  chatCallback: null as ((msg: unknown) => void) | null,
  killedCallback: null as ((killer: string, victim: string) => void) | null,
};
