import { useRef, useState, useCallback, useEffect } from 'react';
import LobbyScreen from '@/components/LobbyScreen';
import GameCanvas from '@/components/GameCanvas';
import ChatPanel from '@/components/ChatPanel';
import HUD from '@/components/HUD';
import Leaderboard from '@/components/Leaderboard';
import Minimap from '@/components/Minimap';
import type { ChatMessage, PlayerState, Orb, Terrain } from '@/types/game';
import type { GameScene } from '@/game/scenes/GameScene';

const PARTY_HOST = import.meta.env.VITE_PARTYKIT_HOST ?? 'localhost:1999';

type AppState = 'lobby' | 'connecting' | 'playing';

export default function App() {
  const [appState, setAppState] = useState<AppState>('lobby');
  const [myId, setMyId] = useState('');
  const [players, setPlayers] = useState<Record<string, PlayerState>>({});
  const [orbs, setOrbs] = useState<Record<string, Orb>>({});
  const [terrain, setTerrain] = useState<Terrain | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const gameSceneRef = useRef<GameScene | null>(null);

  const handleJoin = useCallback((name: string, room: string) => {
    const proto = PARTY_HOST.startsWith('localhost') ? 'ws' : 'wss';
    const ws = new WebSocket(`${proto}://${PARTY_HOST}/parties/main/${room}`);
    socketRef.current = ws;
    setAppState('connecting');

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', name }));
    };

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data as string);
      if (msg.type === 'welcome') {
        setMyId(msg.id);
        setPlayers(msg.players as Record<string, PlayerState>);
        setOrbs(msg.orbs as Record<string, Orb>);
        setTerrain(msg.terrain as Terrain);
        setAppState('playing');
      }
      if (msg.type === 'state') {
        setPlayers(msg.players as Record<string, PlayerState>);
      }
      if (msg.type === 'orb_eaten') {
        setOrbs((prev) => {
          const next = { ...prev };
          delete next[msg.orbId as string];
          next[(msg.newOrb as Orb).id] = msg.newOrb as Orb;
          return next;
        });
      }
    };

    ws.onclose = () => setAppState('lobby');
  }, []);

  const handleChat = useCallback((msg: unknown) => {
    setChatMessages((prev) => [...prev.slice(-99), msg as ChatMessage]);
  }, []);

  const handleKilled = useCallback((_killer: string, _victim: string) => {
    // HUD re-renders from player state
  }, []);

  const handleSendChat = useCallback((text: string) => {
    gameSceneRef.current?.sendChat(text);
  }, []);

  const handleRespawn = useCallback(() => {
    gameSceneRef.current?.respawn();
  }, []);

  // Sync player state updates from socket to React for HUD
  useEffect(() => {
    const ws = socketRef.current;
    if (!ws) return;
    const handler = (ev: MessageEvent) => {
      const msg = JSON.parse(ev.data as string);
      if (msg.type === 'state') setPlayers(msg.players);
      // Keep minimap orbs fresh (GameScene owns ws.onmessage once playing)
      if (msg.type === 'orb_eaten') {
        setOrbs((prev) => {
          const next = { ...prev };
          delete next[msg.orbId as string];
          next[(msg.newOrb as Orb).id] = msg.newOrb as Orb;
          return next;
        });
      }
      if (msg.type === 'orbs_added') {
        setOrbs((prev) => {
          const next = { ...prev };
          for (const orb of msg.orbs as Orb[]) next[orb.id] = orb;
          return next;
        });
      }
    };
    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [appState]);

  if (appState === 'lobby') return <LobbyScreen onJoin={handleJoin} />;

  if (appState === 'connecting') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0a0a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00ffcc', fontSize: 20 }}>
        Connecting…
      </div>
    );
  }

  return (
    <>
      {socketRef.current && (
        <GameCanvas
          socket={socketRef.current}
          myId={myId}
          onChat={handleChat}
          onKilled={handleKilled}
          gameSceneRef={gameSceneRef}
        />
      )}
      <HUD
        me={players[myId]}
        playerCount={Object.keys(players).length}
        onRespawn={handleRespawn}
      />
      <Leaderboard players={players} myId={myId} />
      <Minimap players={players} orbs={orbs} myId={myId} terrain={terrain} />
      <ChatPanel
        messages={chatMessages}
        onSend={handleSendChat}
        myId={myId}
      />
    </>
  );
}
