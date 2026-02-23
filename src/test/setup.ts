import "@testing-library/jest-dom/vitest";

// Mock chrome API
const storageMock: Record<string, unknown> = {};
const localStorageMock: Record<string, unknown> = {};
const sessionStorageMock: Record<string, unknown> = {};

/** Clear all mock storage for test isolation. */
export function clearMockStorage() {
  for (const key of Object.keys(storageMock)) delete storageMock[key];
  for (const key of Object.keys(localStorageMock)) delete localStorageMock[key];
  for (const key of Object.keys(sessionStorageMock)) delete sessionStorageMock[key];
}

function createStorageArea(store: Record<string, unknown>) {
  return {
    get: vi.fn((keys?: string | string[] | null) => {
      if (keys === null || keys === undefined) {
        return Promise.resolve({ ...store });
      }
      if (typeof keys === "string") {
        return Promise.resolve({ [keys]: store[keys] });
      }
      const result: Record<string, unknown> = {};
      for (const key of keys) {
        result[key] = store[key];
      }
      return Promise.resolve(result);
    }),
    set: vi.fn((items: Record<string, unknown>) => {
      Object.assign(store, items);
      return Promise.resolve();
    }),
    remove: vi.fn((keys: string | string[]) => {
      const keyArr = typeof keys === "string" ? [keys] : keys;
      for (const key of keyArr) {
        delete store[key];
      }
      return Promise.resolve();
    }),
  };
}

globalThis.chrome = {
  storage: {
    sync: createStorageArea(storageMock),
    local: createStorageArea(localStorageMock),
    session: createStorageArea(sessionStorageMock),
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
  contextMenus: {
    create: vi.fn(),
    onClicked: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(() => Promise.resolve()),
    clearAll: vi.fn(() => Promise.resolve()),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
} as unknown as typeof chrome;
