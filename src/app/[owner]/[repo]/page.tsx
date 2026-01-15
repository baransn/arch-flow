import { Suspense } from 'react';
import DiagramViewer from '@/components/DiagramViewer';
import ProgressStream from '@/components/ProgressStream';
import { getAnalysis } from '@/lib/storage';

interface PageProps {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
}

export default async function RepoPage({ params }: PageProps) {
  const { owner, repo } = await params;

  // Check if we have cached analysis
  const analysis = await getAnalysis({ owner, name: repo });

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <a
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-4 inline-block"
          >
            ← Back to Home
          </a>
          <h1 className="text-4xl font-bold mb-2">
            {owner}/{repo}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Architecture Visualization
          </p>
        </div>

        {/* Content */}
        <Suspense fallback={<LoadingSkeleton />}>
          {analysis ? (
            <DiagramViewer analysis={analysis} />
          ) : (
            <ProgressStream owner={owner} name={repo} />
          )}
        </Suspense>
      </div>
    </main>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  );
}
