import { NextRequest, NextResponse } from 'next/server';
import { validateRepoUrl, parseGitHubUrl } from '@/lib/github';
import { createAnalysisJob } from '@/lib/analysis';
import { hasAnalysis, getAnalysis } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, name } = body;

    if (!owner || !name) {
      return NextResponse.json(
        { error: 'Missing owner or name' },
        { status: 400 }
      );
    }

    // Validate the repo URL format
    const repoUrl = `${owner}/${name}`;
    const validation = validateRepoUrl(repoUrl);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const repo = parseGitHubUrl(repoUrl);
    if (!repo) {
      return NextResponse.json(
        { error: 'Invalid repository format' },
        { status: 400 }
      );
    }

    // Check if we already have a cached analysis
    const cached = await hasAnalysis(repo);
    if (cached) {
      const analysis = await getAnalysis(repo);
      if (analysis) {
        return NextResponse.json({
          cached: true,
          analysis: analysis,
          message: 'Returning cached analysis',
        });
      }
    }

    // Create a new analysis job
    const analysisId = await createAnalysisJob(repo);

    // Trigger the analysis process asynchronously
    // We'll use a separate function to handle this
    triggerAnalysis(analysisId, repo);

    return NextResponse.json({
      analysisId,
      message: 'Analysis started',
    });

  } catch (error) {
    console.error('Error in /api/analyze:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Asynchronous analysis trigger - doesn't block the response
async function triggerAnalysis(analysisId: string, repo: { owner: string; name: string }) {
  // This will be implemented to:
  // 1. Download the repo
  // 2. Run Claude analysis
  // 3. Generate diagram
  // 4. Update status along the way
  // 5. Save final result to Blob storage

  // For now, we'll just import and call a separate analyzer function
  const { runAnalysis } = await import('@/lib/analyzer');
  await runAnalysis(analysisId, repo);
}
