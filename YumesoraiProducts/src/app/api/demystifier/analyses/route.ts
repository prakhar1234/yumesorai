import { NextResponse } from 'next/server';

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:5050';

export async function GET() {
  try {
    const response = await fetch(`${FLASK_API_URL}/api/analyses`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Flask API error' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Analyses list proxy error:', err);
    return NextResponse.json(
      { error: 'Could not reach analysis service' },
      { status: 502 }
    );
  }
}
