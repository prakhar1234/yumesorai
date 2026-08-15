import { NextRequest, NextResponse } from 'next/server';

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:5050';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.repo_url) {
      return NextResponse.json(
        { error: 'repo_url is required' },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    // 3 minutes: accounts for GitHub source download + LLM analysis
    const timeout = setTimeout(() => controller.abort(), 180000);

    try {
      const response = await fetch(`${FLASK_API_URL}/api/demystify`, {
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
          { error: 'Analysis timed out. The repository may be too large.' },
          { status: 504 }
        );
      }
      throw err;
    }
  } catch (err) {
    console.error('Demystifier proxy error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
