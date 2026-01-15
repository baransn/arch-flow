// KV client with local development fallback

// In-memory store for local development
const memoryStore = new Map<string, { value: any; expiresAt?: number }>();

export const kvClient = {
  async get<T = string>(key: string): Promise<T | null> {
    // Development mode: use in-memory storage
    if (process.env.NODE_ENV === 'development' || !process.env.KV_REST_API_URL) {
      const item = memoryStore.get(key);
      if (!item) return null;

      // Check expiration
      if (item.expiresAt && Date.now() > item.expiresAt) {
        memoryStore.delete(key);
        return null;
      }

      return item.value as T;
    }

    // Production mode: use Vercel KV
    const { kv } = await import('@vercel/kv');
    return await kv.get<T>(key);
  },

  async set(key: string, value: any, options?: { ex?: number }): Promise<void> {
    // Development mode: use in-memory storage
    if (process.env.NODE_ENV === 'development' || !process.env.KV_REST_API_URL) {
      const item: { value: any; expiresAt?: number } = { value };

      if (options?.ex) {
        item.expiresAt = Date.now() + (options.ex * 1000);
      }

      memoryStore.set(key, item);
      console.log(`[KV] Set key: ${key}, size: ${memoryStore.size} items`);
      return;
    }

    // Production mode: use Vercel KV
    const { kv } = await import('@vercel/kv');
    await kv.set(key, value, options as any);
  },

  async del(key: string): Promise<void> {
    // Development mode: use in-memory storage
    if (process.env.NODE_ENV === 'development' || !process.env.KV_REST_API_URL) {
      memoryStore.delete(key);
      return;
    }

    // Production mode: use Vercel KV
    const { kv } = await import('@vercel/kv');
    await kv.del(key);
  },
};
