import { openStore, resolveDatabasePath, type Store } from "./db/store";
import { createServices, type Services } from "./services";

const globalStore = globalThis as { __myosStudio?: Store };

export function getStore(): Store {
  if (!globalStore.__myosStudio) {
    const resolved = resolveDatabasePath();
    globalStore.__myosStudio = openStore(resolved.path, resolved.persistence);
  }
  return globalStore.__myosStudio;
}

export function getServices(): Services {
  return createServices(getStore());
}
