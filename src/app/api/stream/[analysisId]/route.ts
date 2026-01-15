import { NextRequest } from 'next/server';
import { getAnalysisJob } from '@/lib/analysis';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  const { analysisId } = await params;

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Helper function to send SSE message
      const sendEvent = (event: string, data: any) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // Poll for updates every second
        const pollInterval = setInterval(async () => {
          try {
            const job = await getAnalysisJob(analysisId);

            if (!job) {
              sendEvent('error', { message: 'Analysis job not found' });
              clearInterval(pollInterval);
              controller.close();
              return;
            }

            // Send status update
            sendEvent('status', job.status);

            // Check if analysis is complete
            if (job.status.status === 'complete' && job.result) {
              sendEvent('complete', job.result);
              clearInterval(pollInterval);
              controller.close();
              return;
            }

            // Check if analysis failed
            if (job.status.status === 'error') {
              sendEvent('error', {
                message: job.status.error || 'Analysis failed',
              });
              clearInterval(pollInterval);
              controller.close();
              return;
            }
          } catch (error) {
            console.error('Error polling analysis job:', error);
            sendEvent('error', { message: 'Error checking analysis status' });
            clearInterval(pollInterval);
            controller.close();
          }
        }, 1000);

        // Cleanup on client disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(pollInterval);
          controller.close();
        });

      } catch (error) {
        console.error('Error in SSE stream:', error);
        sendEvent('error', { message: 'Stream error' });
        controller.close();
      }
    },
  });

  // Return SSE response with proper headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering on nginx
    },
  });
}
