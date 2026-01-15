// Blob client with local development fallback

// In-memory blob store for local development
const memoryBlobs = new Map<string, string>();

export const blobClient = {
  async put(
    key: string,
    data: string,
    options?: { access?: 'public'; addRandomSuffix?: boolean }
  ): Promise<{ url: string }> {
    // Development mode: use in-memory storage
    if (process.env.NODE_ENV === 'development' || !process.env.BLOB_READ_WRITE_TOKEN) {
      memoryBlobs.set(key, data);
      // Return a mock URL
      return { url: `http://localhost:3000/mock-blob/${key}` };
    }

    // Production mode: use Vercel Blob
    const { put } = await import('@vercel/blob');
    return await put(key, data, options as any);
  },

  async head(key: string): Promise<void> {
    // Development mode: check in-memory storage
    if (process.env.NODE_ENV === 'development' || !process.env.BLOB_READ_WRITE_TOKEN) {
      if (!memoryBlobs.has(key)) {
        throw new Error('Blob not found');
      }
      return;
    }

    // Production mode: use Vercel Blob
    const { head } = await import('@vercel/blob');
    await head(key);
  },

  async get(key: string): Promise<string | null> {
    // Development mode: get from in-memory storage
    if (process.env.NODE_ENV === 'development' || !process.env.BLOB_READ_WRITE_TOKEN) {
      return memoryBlobs.get(key) || null;
    }

    // Production mode: use Vercel Blob SDK to list and find the blob
    try {
      const { list } = await import('@vercel/blob');

      // List all blobs with this prefix
      const { blobs } = await list({ prefix: key });
      console.log(`[Blob] Looking for key: ${key}, found ${blobs.length} blobs`);

      if (blobs.length > 0) {
        console.log(`[Blob] First blob pathname: ${blobs[0].pathname}`);
      }

      // Find exact match
      const exactMatch = blobs.find(b => b.pathname === key);

      if (!exactMatch) {
        console.log(`[Blob] No exact match found for ${key}`);
        return null;
      }

      console.log(`[Blob] Found blob at URL: ${exactMatch.url}`);

      // Fetch the blob content from its URL
      const response = await fetch(exactMatch.url);
      if (!response.ok) {
        console.error(`[Blob] Failed to fetch blob: ${response.status}`);
        return null;
      }

      return await response.text();
    } catch (error) {
      console.error(`Error fetching blob ${key}:`, error);
      return null;
    }
  },

  getUrl(key: string): string {
    // Development mode: return mock URL
    if (process.env.NODE_ENV === 'development' || !process.env.BLOB_READ_WRITE_TOKEN) {
      return `http://localhost:3000/mock-blob/${key}`;
    }

    // Production mode: construct real blob URL
    const storeName = process.env.BLOB_READ_WRITE_TOKEN?.split('_')[0];
    return `https://${storeName}.public.blob.vercel-storage.com/${key}`;
  },
};
