/* Hosts a reader document (see lib/reader-html) in a WebView and relays JSON messages both ways. */
import { useImperativeHandle, useRef, type ComponentType, type Ref } from 'react';
import { WebView as RNWebView, type WebViewProps } from 'react-native-webview';

// The library types WebView as a function component without `ref`, though it forwards one.
type WebViewRef = { injectJavaScript: (js: string) => void };
const WebView = RNWebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewRef> }>;

export interface ReaderFrameHandle { send: (cmd: object) => void }
export type ReaderMessage = { type: string; [k: string]: unknown };

const ORIGIN = 'https://reader.local/';

export function ReaderFrame({ html, bg, onMessage, ref }: {
  html: string; bg: string; onMessage: (m: ReaderMessage) => void; ref?: Ref<ReaderFrameHandle>;
}) {
  const wv = useRef<WebViewRef>(null);
  useImperativeHandle(ref, () => ({
    send: (cmd) => wv.current?.injectJavaScript(`window.__cmd && window.__cmd(${JSON.stringify(cmd)}); true;`),
  }), []);
  return (
    <WebView
      ref={wv}
      // A real origin lets pdf.js load itself from blob: URLs.
      source={{ html, baseUrl: ORIGIN }}
      originWhitelist={['*']}
      style={{ flex: 1, backgroundColor: bg }}
      containerStyle={{ backgroundColor: bg }}
      javaScriptEnabled
      setSupportMultipleWindows={false}
      allowsLinkPreview={false}
      textZoom={100}
      // Only the reader document itself may load; links are handled by the app.
      onShouldStartLoadWithRequest={(req) => req.url.startsWith(ORIGIN) || req.url.startsWith('about:') || req.url.startsWith('blob:') || req.url.startsWith('data:')}
      onMessage={(e) => {
        try { onMessage(JSON.parse(e.nativeEvent.data)); } catch { /* ignore malformed */ }
      }}
    />
  );
}
