import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '@/game/config';
import { gameStore } from '@/game/gameStore';
import type { GameScene } from '@/game/scenes/GameScene';

interface Props {
  socket: WebSocket;
  myId: string;
  onChat: (msg: unknown) => void;
  onKilled: (killer: string, victim: string) => void;
  gameSceneRef: React.MutableRefObject<GameScene | null>;
}

export default function GameCanvas({ socket, myId, onChat, onKilled, gameSceneRef }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const phaserRef = useRef<Phaser.Game | null>(null);

  // Keep store in sync whenever props change
  gameStore.socket = socket;
  gameStore.myId = myId;
  gameStore.chatCallback = onChat;
  gameStore.killedCallback = onKilled;

  useEffect(() => {
    if (!divRef.current || phaserRef.current) return;

    const game = new Phaser.Game(createGameConfig(divRef.current));
    phaserRef.current = game;

    // Expose the GameScene ref once Phaser is fully booted
    game.events.once(Phaser.Core.Events.READY, () => {
      // Poll until GameScene is active (it starts after PreloadScene finishes)
      const interval = setInterval(() => {
        const gs = game.scene.getScene('GameScene') as GameScene | null;
        if (gs?.scene.isActive()) {
          gameSceneRef.current = gs;
          clearInterval(interval);
        }
      }, 100);
    });

    return () => {
      phaserRef.current?.destroy(true);
      phaserRef.current = null;
      gameSceneRef.current = null;
    };
  }, []); // run once — gameStore handles live prop updates

  return <div ref={divRef} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />;
}
