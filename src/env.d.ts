declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
    VUE_ROUTER_BASE: string | undefined;
  }
}

declare module 'virtual:game-script' {
  export const scriptSources: Record<string, string>;
  const source: string;
  export default source;
}
declare module 'virtual:game-script-hmr' {
  export const scriptSources: Record<string, string>;
  const source: string;
  export default source;
}
declare module 'virtual:script-sdk' {
  const source: string;
  export default source;
}

declare module 'live2d-native-backend' {
  import type { ILive2DBackend } from './engine/live2d/backend';
  export const NativeLive2DBackend: { new(): ILive2DBackend };
}
