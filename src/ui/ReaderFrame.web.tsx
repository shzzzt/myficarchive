/* Web build: the reader document runs in an <iframe> and talks over postMessage. */
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';

export interface ReaderFrameHandle { send: (cmd: object) => void }
export type ReaderMessage = { type: string; [k: string]: unknown };

export function ReaderFrame({ html, bg, onMessage, ref }: {
  html: string; bg: string; onMessage: (m: ReaderMessage) => void; ref?: Ref<ReaderFrameHandle>;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const handler = useRef(onMessage);
  useEffect(() => { handler.current = onMessage; }, [onMessage]);

  useImperativeHandle(ref, () => ({
    send: (cmd) => frame.current?.contentWindow?.postMessage(JSON.stringify({ ...cmd, __reader: true }), '*'),
  }), []);

  useEffect(() => {
    const listen = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || typeof e.data !== 'string') return;
      try {
        const m = JSON.parse(e.data);
        if (m.__reader) handler.current(m);
      } catch { /* ignore */ }
    };
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, []);

  return <iframe ref={frame} title="Reader" srcDoc={html} style={{ flex: 1, border: 0, width: '100%', height: '100%', background: bg }} />;
}
