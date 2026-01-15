'use client';

import { useEffect, useState } from 'react';
import type { AnalysisStatus } from '@/lib/types';

interface ProgressStreamProps {
  owner: string;
  name: string;
}

export default function ProgressStream({ owner, name }: ProgressStreamProps) {
  const [status, setStatus] = useState<AnalysisStatus>({
    status: 'downloading',
    progress: 0,
    message: 'Starting analysis...',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    async function startAnalysis() {
      try {
        // Start the analysis
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner, name }),
        });

        if (!response.ok) {
          throw new Error('Failed to start analysis');
        }

        const data = await response.json();

        // If analysis is cached, show error since server-side rendering should have shown it
        if (data.cached) {
          setError('Analysis is cached but could not be loaded. Please try again.');
          return;
        }

        const { analysisId } = data;

        // Connect to SSE stream
        eventSource = new EventSource(`/api/stream/${analysisId}`);

        eventSource.addEventListener('status', (e) => {
          const data = JSON.parse(e.data) as AnalysisStatus;
          setStatus(data);
        });

        eventSource.addEventListener('complete', (e) => {
          const data = JSON.parse(e.data);
          // Reload the page to show the results
          window.location.reload();
        });

        eventSource.addEventListener('error', (e) => {
          const data = JSON.parse((e as MessageEvent).data);
          setError(data.message || 'An error occurred');
          eventSource?.close();
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }

    startAnalysis();

    return () => {
      eventSource?.close();
    };
  }, [owner, name]);

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-2">
          Analysis Failed
        </h2>
        <p className="text-red-600 dark:text-red-300">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
      <h2 className="text-2xl font-bold mb-6">Analyzing Repository...</h2>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-600 to-purple-600 h-full transition-all duration-500 ease-out"
            style={{ width: `${status.progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-right">
          {status.progress}%
        </p>
      </div>

      {/* Status Steps */}
      <div className="space-y-4">
        <StatusStep
          label="Downloading Repository"
          active={status.status === 'downloading'}
          completed={['extracting', 'analyzing', 'generating', 'complete'].includes(status.status)}
        />
        <StatusStep
          label="Extracting Files"
          active={status.status === 'extracting'}
          completed={['analyzing', 'generating', 'complete'].includes(status.status)}
        />
        <StatusStep
          label="Analyzing Architecture"
          active={status.status === 'analyzing'}
          completed={['generating', 'complete'].includes(status.status)}
        />
        <StatusStep
          label="Generating Diagram"
          active={status.status === 'generating'}
          completed={status.status === 'complete'}
        />
      </div>

      {/* Current Message */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-blue-800 dark:text-blue-200 font-medium">
          {status.message}
        </p>
      </div>
    </div>
  );
}

function StatusStep({
  label,
  active,
  completed,
}: {
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center space-x-3">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center ${
          completed
            ? 'bg-green-500'
            : active
            ? 'bg-blue-500 animate-pulse'
            : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        {completed && (
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span
        className={`${
          active || completed
            ? 'text-gray-900 dark:text-gray-100 font-medium'
            : 'text-gray-500 dark:text-gray-500'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
