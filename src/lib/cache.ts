import { kvClient as kv } from './kv-client';
import type { CacheMetadata, GitHubRepo } from './types';
import { getRepoKey } from './github';

const CACHE_PREFIX = 'arch-flow:';
const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days

export async function setCacheMetadata(
  repo: GitHubRepo,
  metadata: Omit<CacheMetadata, 'repoKey'>
): Promise<void> {
  const key = `${CACHE_PREFIX}${getRepoKey(repo)}`;
  const data: CacheMetadata = {
    ...metadata,
    repoKey: getRepoKey(repo),
  };

  await kv.set(key, JSON.stringify(data), { ex: CACHE_TTL });
}

export async function getCacheMetadata(
  repo: GitHubRepo
): Promise<CacheMetadata | null> {
  const key = `${CACHE_PREFIX}${getRepoKey(repo)}`;
  const data = await kv.get<string>(key);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function invalidateCache(repo: GitHubRepo): Promise<void> {
  const key = `${CACHE_PREFIX}${getRepoKey(repo)}`;
  await kv.del(key);
}
