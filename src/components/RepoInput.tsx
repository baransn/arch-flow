'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseGitHubUrl, validateRepoUrl } from '@/lib/github';

export default function RepoInput() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const validation = validateRepoUrl(url);
    if (!validation.valid) {
      setError(validation.error || 'Invalid URL');
      setIsLoading(false);
      return;
    }

    const repo = parseGitHubUrl(url);
    if (!repo) {
      setError('Could not parse repository URL');
      setIsLoading(false);
      return;
    }

    // Navigate to the repo page
    router.push(`/repo/${repo.owner}/${repo.name}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="repo-url" className="block text-sm font-medium mb-2">
            GitHub Repository URL
          </label>
          <input
            id="repo-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo or owner/repo"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            disabled={isLoading}
          />
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {isLoading ? 'Analyzing...' : 'Visualize Architecture'}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>Examples:</p>
        <div className="mt-2 space-y-1">
          <button
            onClick={() => setUrl('vercel/next.js')}
            className="block mx-auto text-blue-600 dark:text-blue-400 hover:underline"
          >
            vercel/next.js
          </button>
          <button
            onClick={() => setUrl('facebook/react')}
            className="block mx-auto text-blue-600 dark:text-blue-400 hover:underline"
          >
            facebook/react
          </button>
        </div>
      </div>
    </div>
  );
}
