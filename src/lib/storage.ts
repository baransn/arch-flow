import { blobClient } from './blob-client';
import type { ArchitectureAnalysis, GitHubRepo } from './types';
import { getRepoKey } from './github';

export async function saveAnalysis(
  repo: GitHubRepo,
  analysis: ArchitectureAnalysis
): Promise<string> {
  const key = `${getRepoKey(repo)}/analysis.json`;

  const { url } = await blobClient.put(key, JSON.stringify(analysis), {
    access: 'public',
    addRandomSuffix: false,
  });

  return url;
}

export async function getAnalysis(
  repo: GitHubRepo
): Promise<ArchitectureAnalysis | null> {
  const key = `${getRepoKey(repo)}/analysis.json`;

  try {
    // Try to get from blob client (handles dev vs prod)
    const data = await blobClient.get(key);
    if (!data) return null;

    return JSON.parse(data);
  } catch (error) {
    console.error('Error fetching analysis:', error);
    return null;
  }
}

export async function hasAnalysis(repo: GitHubRepo): Promise<boolean> {
  const key = `${getRepoKey(repo)}/analysis.json`;

  try {
    await blobClient.head(key);
    return true;
  } catch {
    return false;
  }
}
