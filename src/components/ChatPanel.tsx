import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@/types/game';

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  myId: string;
}

export default function ChatPanel({ messages, onSend, myId }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = () => {
    const t = draft.trim();
    if (t) { onSend(t); setDraft(''); }
  };

  return (
    <div style={{ ...styles.container, height: open ? 280 : 48 }}>
      <button style={styles.toggle} onClick={() => setOpen((o) => !o)}>
        {open ? '✕ Chat' : `💬 Chat${messages.length ? ` (${messages.length})` : ''}`}
      </button>

      {open && (
        <>
          <div ref={listRef} style={styles.list}>
            {messages.map((m, i) => (
              <div key={i} style={{ ...styles.msg, color: m.from === myId ? '#00ffcc' : '#cce' }}>
                <span style={styles.msgName}>{m.name}: </span>
                {m.text}
              </div>
            ))}
          </div>
          <div style={styles.inputRow}>
            <input
              style={styles.input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Say something…"
              maxLength={200}
            />
            <button style={styles.sendBtn} onClick={send}>→</button>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 'var(--safe-bottom, 0px)',
    left: 'calc(12px + var(--safe-left, 0px))',
    width: 260,
    background: 'rgba(8,12,30,0.88)',
    border: '1px solid rgba(0,255,255,0.2)',
    borderBottom: 'none',
    borderRadius: '10px 10px 0 0',
    overflow: 'hidden',
    transition: 'height 0.2s ease',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
  },
  toggle: {
    flex: '0 0 48px',
    background: 'none',
    border: 'none',
    color: '#00ffcc',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    padding: '0 14px',
    textAlign: 'left',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  msg: { fontSize: 12, lineHeight: 1.4, wordBreak: 'break-word' },
  msgName: { fontWeight: 700 },
  inputRow: { display: 'flex', borderTop: '1px solid rgba(0,255,255,0.15)', height: 40 },
  input: {
    flex: 1,
    background: 'none',
    border: 'none',
    color: '#fff',
    padding: '0 10px',
    fontSize: 13,
    outline: 'none',
  },
  sendBtn: {
    background: 'none',
    border: 'none',
    color: '#00ffcc',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 10px',
  },
};
