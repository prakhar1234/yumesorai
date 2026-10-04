import { NextRequest, NextResponse } from 'next/server';

const FLASK_API_URL = process.env.FLASK_API_URL;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

function parseGithubUrl(repoUrl: string): { owner: string; repo: string } | null {
  const cleaned = repoUrl.replace(/^https?:\/\//, '').replace(/\.git$/, '');
  const match = cleaned.match(/^github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

async function fetchBranchesFromGitHub(owner: string, repo: string) {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `token ${GITHUB_TOKEN}`;
  }

  // Get default branch
  let defaultBranch = 'main';
  try {
    const repoResp = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (repoResp.ok) {
      const repoData = await repoResp.json();
      defaultBranch = repoData.default_branch || 'main';
    }
  } catch {
    // fall through, use 'main'
  }

  // Get all branches (paginated)
  const allBranches: { name: string; default: boolean }[] = [];
  let page = 1;
  while (true) {
    const resp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100&page=${page}`,
      { headers }
    );
    if (!resp.ok) {
      throw new Error(`GitHub API returned ${resp.status}`);
    }
    const data = await resp.json();
    for (const b of data) {
      allBranches.push({ name: b.name, default: b.name === defaultBranch });
    }
    if (data.length < 100) break;
    page++;
  }

  // Sort: default first, then alphabetical
  allBranches.sort((a, b) => {
    if (a.default && !b.default) return -1;
    if (!a.default && b.default) return 1;
    return a.name.localeCompare(b.name);
  });

  return allBranches;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.repo_url) {
      return NextResponse.json(
        { error: 'repo_url is required' },
        { status: 400 }
      );
    }

    // If Flask API is configured, proxy to it
    if (FLASK_API_URL) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(`${FLASK_API_URL}/api/branches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Flask API error' }));
          return NextResponse.json(error, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
      } catch (err: unknown) {
        clearTimeout(timeout);
        if (err instanceof Error && err.name === 'AbortError') {
          return NextResponse.json(
            { error: 'Branch listing timed out.' },
            { status: 504 }
          );
        }
        // Flask unavailable — fall through to direct GitHub call
        console.warn('Flask API unavailable for branches, falling back to direct GitHub API');
      }
    }

    // Direct GitHub API call (no Flask needed)
    const parsed = parseGithubUrl(body.repo_url);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid GitHub repository URL' },
        { status: 400 }
      );
    }

    const branches = await fetchBranchesFromGitHub(parsed.owner, parsed.repo);
    return NextResponse.json({ branches, count: branches.length });
  } catch (err) {
    console.error('Branches proxy error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch branches' },
      { status: 502 }
    );
  }
}
