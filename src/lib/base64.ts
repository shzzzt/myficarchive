/* Base64 encoding for Uint8Array without relying on btoa (not on every JS engine). */
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function toBase64(bytes: Uint8Array): string {
  const parts: string[] = [];
  let chunk = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    chunk += CHARS[(n >> 18) & 63] + CHARS[(n >> 12) & 63]
      + (b === undefined ? '=' : CHARS[(n >> 6) & 63])
      + (c === undefined ? '=' : CHARS[n & 63]);
    // Join in pieces to avoid quadratic string growth on big images.
    if (chunk.length > 8192) { parts.push(chunk); chunk = ''; }
  }
  parts.push(chunk);
  return parts.join('');
}
