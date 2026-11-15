import { PixiLive2DBackend } from './pixi-backend';
import { NativeLive2DBackend } from 'live2d-native-backend';
import { useSettingsStore } from '../../stores/settings-store';
import type { ILive2DBackend } from './backend';

let backend: ILive2DBackend | null = null;

export function getLive2DBackend(): ILive2DBackend {
  if (!backend) {
    const settings = useSettingsStore();
    const type = settings.displaySettings.live2dBackend;

    if (type === 'native') {
      console.log('[Live2D] Using Native Backend');
      backend = new NativeLive2DBackend();
    } else {
      console.log('[Live2D] Using Pixi Backend');
      backend = new PixiLive2DBackend();
    }
  }
  return backend!;
}
