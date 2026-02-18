import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const apiUrl = process.env.ADDRESS_API_URL;
  const apiKey = process.env.ADDRESS_API_KEY;

  if (!apiUrl || !apiKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${apiUrl}/api/v1/geocode`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return NextResponse.json(
        { error: 'Address not found. Please verify and try again.' },
        { status: 404 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: 'An error occurred. Please try again later.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timed out. Please try again later.' },
        { status: 408 }
      );
    }
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
