/** Augment this interface with typed application extensions when authoring scenes. */
interface ScriptExtensions {
  [name: string]: (...args: unknown[]) => unknown;
}
declare const external: ScriptExtensions;
