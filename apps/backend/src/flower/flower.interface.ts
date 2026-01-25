export interface StartRunOptions {
  fabHash: string;
  fabContent: Buffer;
  overrideConfig?: Record<string, any>;
  federation: string;
}
