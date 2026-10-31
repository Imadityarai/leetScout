import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import type { Difficulty, LeetCodeQuestion, Problem, RatingRecord } from './src/types';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const cacheDirectory = path.join(projectRoot, 'assets');
const cacheFile = path.join(cacheDirectory, 'problems.json');
const ratingsUrl =
  'https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/data.json';
const leetcodeUrl = 'https://leetcode.com/graphql';
const pageSize = 100;

const questionQuery = `
  query problemsetQuestionListV2($categorySlug: String, $limit: Int, $skip: Int) {
    problemsetQuestionListV2(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
    ) {
      hasMore
      questions {
        questionFrontendId
        title
        titleSlug
        difficulty
        topicTags { name slug }
        paidOnly
      }
    }
  }
`;

interface LeetCodeResponse {
  data?: {
    problemsetQuestionListV2?: {
      hasMore: boolean;
      questions: Array<{
        questionFrontendId: string;
        title: string;
        titleSlug: string;
        difficulty: string;
        topicTags: Array<{ name: string; slug: string }>;
        paidOnly: boolean;
      }>;
    };
  };
  errors?: Array<{ message: string }>;
}

function isProblemList(value: unknown): value is Problem[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (problem) =>
        typeof problem?.frontendQuestionId === 'string' &&
        typeof problem?.title === 'string' &&
        typeof problem?.titleSlug === 'string' &&
        ['Easy', 'Medium', 'Hard'].includes(problem?.difficulty) &&
        Array.isArray(problem?.topicTags) &&
        problem.topicTags.every(
          (tag: unknown) =>
            typeof tag === 'object' &&
            tag !== null &&
            typeof (tag as { name?: unknown }).name === 'string' &&
            typeof (tag as { slug?: unknown }).slug === 'string',
        ) &&
        typeof problem?.paidOnly === 'boolean' &&
        (typeof problem?.rating === 'number' || problem?.rating === null),
    )
  );
}

function normalizeDifficulty(difficulty: string): Difficulty {
  switch (difficulty.toUpperCase()) {
    case 'EASY':
      return 'Easy';
    case 'MEDIUM':
      return 'Medium';
    case 'HARD':
      return 'Hard';
    default:
      throw new Error(`LeetCode returned an unknown difficulty: ${difficulty}`);
  }
}

async function fetchQuestions(): Promise<LeetCodeQuestion[]> {
  const questions: LeetCodeQuestion[] = [];
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(leetcodeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://leetcode.com',
        Referer: 'https://leetcode.com/',
      },
      body: JSON.stringify({
        query: questionQuery,
        variables: {
          categorySlug: 'algorithms',
          limit: pageSize,
          skip: questions.length,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`LeetCode returned HTTP ${response.status}.`);
    }

    const result = (await response.json()) as LeetCodeResponse;
    if (result.errors?.length) {
      throw new Error(`LeetCode: ${result.errors[0].message}`);
    }

    const page = result.data?.problemsetQuestionListV2;
    if (!page || (page.questions.length === 0 && page.hasMore)) {
      throw new Error('LeetCode returned an incomplete problem list.');
    }

    questions.push(
      ...page.questions.map((question) => ({
        frontendQuestionId: question.questionFrontendId,
        title: question.title,
        titleSlug: question.titleSlug,
        difficulty: normalizeDifficulty(question.difficulty),
        topicTags: question.topicTags,
        paidOnly: question.paidOnly,
      })),
    );
    hasMore = page.hasMore;
  }

  if (questions.length === 0) {
    throw new Error('LeetCode returned no problems.');
  }
  return questions;
}

async function fetchRatings(): Promise<RatingRecord[]> {
  const response = await fetch(ratingsUrl);
  if (!response.ok) {
    throw new Error(`The ratings source returned HTTP ${response.status}.`);
  }

  const records = (await response.json()) as unknown;
  if (
    !Array.isArray(records) ||
    records.length === 0 ||
    !records.every(
      (record) =>
        typeof record?.TitleSlug === 'string' &&
        typeof record?.Rating === 'number',
    )
  ) {
    throw new Error('The ratings source returned data in an unexpected format.');
  }

  return records as RatingRecord[];
}

async function fetchAndSaveProblems(): Promise<Problem[]> {
  const [questions, ratings] = await Promise.all([
    fetchQuestions(),
    fetchRatings(),
  ]);
  const ratingsBySlug = new Map(
    ratings.map((record) => [record.TitleSlug, record.Rating]),
  );
  const problems = questions.map((question) => ({
    ...question,
    rating: ratingsBySlug.get(question.titleSlug) ?? null,
  }));

  await mkdir(cacheDirectory, { recursive: true });
  const temporaryFile = `${cacheFile}.${process.pid}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(problems, null, 2), 'utf8');
  await rename(temporaryFile, cacheFile);
  return problems;
}

async function getProblems(): Promise<{ problems: Problem[]; cached: boolean }> {
  try {
    const cachedData = await readFile(cacheFile, 'utf8');
    const parsed: unknown = JSON.parse(cachedData);
    if (!isProblemList(parsed)) {
      throw new Error(`The problem cache at ${cacheFile} is invalid.`);
    }
    return { problems: parsed, cached: true };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  return { problems: await fetchAndSaveProblems(), cached: false };
}

let pendingLoad: Promise<{ problems: Problem[]; cached: boolean }> | null = null;

function createProblemCachePlugin(): Plugin {
  const handleRequest = (
    request: import('node:http').IncomingMessage,
    response: import('node:http').ServerResponse,
    next: (error?: Error) => void,
  ) => {
    if (request.url?.split('?')[0] !== '/api/problems') {
      next();
      return;
    }

    if (request.method !== 'GET') {
      response.statusCode = 405;
      response.setHeader('Allow', 'GET');
      response.end('Method not allowed');
      return;
    }

    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');

    const load = pendingLoad ?? (pendingLoad = getProblems());
    load
      .then(({ problems, cached }) => {
        response.statusCode = 200;
        response.setHeader('X-Problem-Cache', cached ? 'HIT' : 'MISS');
        response.end(JSON.stringify(problems));
      })
      .catch((error: unknown) => {
        console.error('Unable to load cached LeetCode problems:', error);
        response.statusCode = 502;
        response.end(
          JSON.stringify({
            error:
              error instanceof Error
                ? error.message
                : 'Unable to load the problem library.',
          }),
        );
      })
      .finally(() => {
        pendingLoad = null;
      });
  };

  return {
    name: 'leetcode-problem-assets-cache',
    configureServer(server) {
      server.middlewares.use(handleRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleRequest);
    },
  };
}

export default defineConfig({
  plugins: [react(), createProblemCachePlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
