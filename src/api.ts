import type { Problem } from './types';

export interface ProblemLoadResult {
  problems: Problem[];
  cached: boolean;
}

export async function loadProblems(signal: AbortSignal): Promise<ProblemLoadResult> {
  const response = await fetch('/api/problems', { signal });
  if (!response.ok) {
    let message = `Problem API returned HTTP ${response.status}.`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }
    throw new Error(message);
  }

  const problems: unknown = await response.json();
  if (
    !Array.isArray(problems) ||
    !problems.every(
      (problem) =>
        typeof problem?.titleSlug === 'string' &&
        typeof problem?.title === 'string' &&
        Array.isArray(problem?.topicTags),
    )
  ) {
    throw new Error('The problem API returned data in an unexpected format.');
  }

  const cacheStatus = response.headers.get('X-Problem-Cache');
  if (cacheStatus !== 'HIT' && cacheStatus !== 'MISS') {
    throw new Error('The problem API did not report its cache status.');
  }

  return { problems: problems as Problem[], cached: cacheStatus === 'HIT' };
}
