import { useEffect, useRef, useState } from 'react';

const PARTY_HOST = import.meta.env.VITE_PARTYKIT_HOST ?? 'localhost:1999';

export function usePartySocket(room: string) {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const proto = PARTY_HOST.startsWith('localhost') ? 'ws' : 'wss';
    const url = `${proto}://${PARTY_HOST}/parties/main/${room}`;
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    return () => ws.close();
  }, [room]);

  return { socket: socketRef.current, connected, socketRef };
}
