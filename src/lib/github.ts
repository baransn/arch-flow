import type { GitHubRepo } from './types';

export function parseGitHubUrl(url: string): GitHubRepo | null {
  // Handle both full URLs and short-hand format
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/]+)/,
    /^([^\/]+)\/([^\/]+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        owner: match[1],
        name: match[2].replace(/\.git$/, ''),
      };
    }
  }

  return null;
}

export function getRepoKey(repo: GitHubRepo): string {
  return `${repo.owner}/${repo.name}`;
}

export async function downloadRepoTarball(repo: GitHubRepo): Promise<Blob> {
  const branch = repo.branch || 'main';
  const url = `https://api.github.com/repos/${repo.owner}/${repo.name}/tarball/${branch}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(process.env.GITHUB_TOKEN && {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      }),
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to download repository: ${response.statusText}`);
  }

  return await response.blob();
}

export function validateRepoUrl(url: string): { valid: boolean; error?: string } {
  const repo = parseGitHubUrl(url);

  if (!repo) {
    return { valid: false, error: 'Invalid GitHub repository URL' };
  }

  if (!repo.owner || !repo.name) {
    return { valid: false, error: 'Invalid repository format' };
  }

  // Basic validation for repository name format
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  if (!validPattern.test(repo.owner) || !validPattern.test(repo.name)) {
    return { valid: false, error: 'Invalid characters in repository name' };
  }

  return { valid: true };
}
