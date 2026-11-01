// Bundle expo-sqlite's .wasm (web), the pdf.js sources (assets/pdfjs/*.txt) and the import template (.xlsx) as assets; allow SharedArrayBuffer on web.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm', 'txt', 'xlsx');

config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  return middleware(req, res, next);
};

module.exports = config;
