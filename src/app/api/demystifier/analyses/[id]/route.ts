import { NextRequest, NextResponse } from 'next/server';

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:5050';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const response = await fetch(`${FLASK_API_URL}/api/analyses/${id}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Flask API error' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Analysis get proxy error:', err);
    return NextResponse.json(
      { error: 'Could not reach analysis service' },
      { status: 502 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const response = await fetch(`${FLASK_API_URL}/api/analyses/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Flask API error' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Analysis delete proxy error:', err);
    return NextResponse.json(
      { error: 'Could not reach analysis service' },
      { status: 502 }
    );
  }
}
