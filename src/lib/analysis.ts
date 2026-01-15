import { kvClient as kv } from './kv-client';
import type { AnalysisStatus, GitHubRepo, ArchitectureAnalysis } from './types';
import { getRepoKey } from './github';
import { randomUUID } from 'crypto';

const ANALYSIS_PREFIX = 'analysis:';
const ANALYSIS_TTL = 60 * 60; // 1 hour

export interface AnalysisJob {
  id: string;
  repo: GitHubRepo;
  status: AnalysisStatus;
  createdAt: number;
  result?: ArchitectureAnalysis;
}

export async function createAnalysisJob(repo: GitHubRepo): Promise<string> {
  const id = randomUUID();
  const job: AnalysisJob = {
    id,
    repo,
    status: {
      status: 'downloading',
      progress: 0,
      message: 'Starting analysis...',
    },
    createdAt: Date.now(),
  };

  const key = `${ANALYSIS_PREFIX}${id}`;
  await kv.set(key, JSON.stringify(job), { ex: ANALYSIS_TTL });
  console.log(`[Analysis] Created job ${id} for ${repo.owner}/${repo.name}`);
  return id;
}

export async function getAnalysisJob(id: string): Promise<AnalysisJob | null> {
  const key = `${ANALYSIS_PREFIX}${id}`;
  const data = await kv.get<string>(key);
  if (!data) {
    console.log(`[Analysis] Job ${id} not found`);
    return null;
  }

  try {
    const job = JSON.parse(data);
    console.log(`[Analysis] Retrieved job ${id}, status: ${job.status.status}`);
    return job;
  } catch {
    console.error(`[Analysis] Failed to parse job ${id}`);
    return null;
  }
}

export async function updateAnalysisStatus(
  id: string,
  status: AnalysisStatus
): Promise<void> {
  const job = await getAnalysisJob(id);
  if (!job) return;

  job.status = status;
  await kv.set(`${ANALYSIS_PREFIX}${id}`, JSON.stringify(job), { ex: ANALYSIS_TTL });
}

export async function completeAnalysisJob(
  id: string,
  result: ArchitectureAnalysis
): Promise<void> {
  console.log(`[Analysis] Completing job ${id}`);
  const job = await getAnalysisJob(id);
  if (!job) {
    console.error(`[Analysis] Cannot complete - job ${id} not found`);
    return;
  }

  job.status = {
    status: 'complete',
    progress: 100,
    message: 'Analysis complete!',
  };
  job.result = result;

  const key = `${ANALYSIS_PREFIX}${id}`;
  await kv.set(key, JSON.stringify(job), { ex: ANALYSIS_TTL });
  console.log(`[Analysis] Job ${id} marked as complete and saved to ${key}`);
}

export async function failAnalysisJob(id: string, error: string): Promise<void> {
  const job = await getAnalysisJob(id);
  if (!job) return;

  job.status = {
    status: 'error',
    progress: 0,
    message: 'Analysis failed',
    error,
  };

  await kv.set(`${ANALYSIS_PREFIX}${id}`, JSON.stringify(job), { ex: ANALYSIS_TTL });
}
