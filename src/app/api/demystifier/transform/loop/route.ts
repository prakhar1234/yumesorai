import { NextRequest, NextResponse } from 'next/server';

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:5050';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.program_content) {
      return NextResponse.json(
        { error: 'program_content is required' },
        { status: 400 }
      );
    }
    if (!body.test_input) {
      return NextResponse.json(
        { error: 'test_input is required' },
        { status: 400 }
      );
    }
    if (!body.expected_output) {
      return NextResponse.json(
        { error: 'expected_output is required' },
        { status: 400 }
      );
    }

    // 10-minute timeout — the loop can run multiple LLM calls + builds
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600000);

    try {
      const response = await fetch(`${FLASK_API_URL}/api/transform/loop`, {
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

      // Forward the NDJSON stream directly
      return new Response(response.body, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no',
        },
      });
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Agent loop timed out.' },
          { status: 504 }
        );
      }
      throw err;
    }
  } catch (err) {
    console.error('Transform loop proxy error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
