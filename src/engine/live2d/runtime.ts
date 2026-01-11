import { PixiLive2DBackend } from './pixi-backend';

let backend: PixiLive2DBackend | null = null;

export function getLive2DBackend() {
  if (!backend) backend = new PixiLive2DBackend();
  return backend;
}

