// Mock @tarojs/taro for unit testing

const mockStorage: Record<string, string> = {};

const Taro = {
  // Storage (sync)
  getStorageSync(key: string): string | null {
    return mockStorage[key] ?? null;
  },
  setStorageSync(key: string, value: string): void {
    mockStorage[key] = value;
  },
  removeStorageSync(key: string): void {
    delete mockStorage[key];
  },

  // Storage (async)
  async getStorage({ key }: { key: string }): Promise<{ data: string }> {
    const data = mockStorage[key];
    if (data === undefined) throw new Error(`No data for key: ${key}`);
    return { data };
  },
  async setStorage({ key, data }: { key: string; data: string }): Promise<void> {
    mockStorage[key] = data;
  },
  async removeStorage({ key }: { key: string }): Promise<void> {
    delete mockStorage[key];
  },

  // Network
  async request(opts: Record<string, unknown>): Promise<{ statusCode: number; data: unknown }> {
    const mockFn = (Taro as unknown as Record<string, unknown>).__mockRequest as
      | ((opts: Record<string, unknown>) => { statusCode: number; data: unknown })
      | undefined;
    if (mockFn) return mockFn(opts);
    return { statusCode: 200, data: { code: 0, data: null } };
  },

  // UI
  async showToast(_opts: Record<string, unknown>): Promise<void> {
    // noop
  },
  async showModal(_opts: Record<string, unknown>): Promise<{ confirm: boolean }> {
    return { confirm: true };
  },

  // Navigation
  async redirectTo(_opts: Record<string, unknown>): Promise<void> {
    // noop
  },
  async navigateTo(_opts: Record<string, unknown>): Promise<void> {
    // noop
  },
  async switchTab(_opts: Record<string, unknown>): Promise<void> {
    // noop
  },

  // Image
  async downloadFile(_opts: Record<string, unknown>): Promise<{ statusCode: number; tempFilePath: string }> {
    return { statusCode: 200, tempFilePath: '/tmp/mock-image.png' };
  },

  // Event center
  eventCenter: {
    trigger(_event: string, _data: unknown): void {
      // noop
    },
    on(_event: string, _callback: (...args: unknown[]) => void): void {
      // noop
    },
    off(_event: string, _callback: (...args: unknown[]) => void): void {
      // noop
    },
  },

  // Test helpers
  __clearStorage(): void {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  },
  __setMockRequest(fn: (opts: Record<string, unknown>) => { statusCode: number; data: unknown }): void {
    (Taro as unknown as Record<string, unknown>).__mockRequest = fn;
  },
};

export default Taro;
