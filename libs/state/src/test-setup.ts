import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'node:util';

// jsdom doesn't provide these, but useChatStream's SSE parsing (a real browser API) needs
// them — polyfill from Node's implementation for tests only.
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder =
    TextDecoder as unknown as typeof globalThis.TextDecoder;
}
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder =
    TextEncoder as unknown as typeof globalThis.TextEncoder;
}
