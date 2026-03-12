import { PlatformAdapter } from "./platform-adapter.js";
import { PlatformKey } from "./platform.js";

export class PlatformRegistry {
  private readonly adapters = new Map<PlatformKey, PlatformAdapter>();

  constructor(adapters: PlatformAdapter[]) {
    for (const adapter of adapters) {
      this.adapters.set(adapter.platform, adapter);
    }
  }

  list() {
    return [...this.adapters.values()];
  }

  get(platform: PlatformKey) {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`Platform adapter not found for ${platform}.`);
    }
    return adapter;
  }
}

