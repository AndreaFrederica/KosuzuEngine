import { registerRouterNavigateCallback } from '../../core/BaseActor';
import { call } from './Runtime';
import { getI18nManager } from './services';

export * from '../../core/BaseActor';
export { defaultRuntime } from './Runtime';

registerRouterNavigateCallback((path) => call('navigate', path));
// The existing actor API reads only this translation adapter from window.
(globalThis as unknown as { window: unknown }).window = { __i18n_manager__: getI18nManager() };
