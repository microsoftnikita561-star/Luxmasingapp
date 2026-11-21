import { cpSync, mkdirSync } from 'node:fs';
const src = 'node_modules/@mediapipe/tasks-vision/wasm';
mkdirSync('public/wasm', { recursive: true });
cpSync(src, 'public/wasm', { recursive: true });
console.log('MediaPipe wasm copied to public/wasm');
