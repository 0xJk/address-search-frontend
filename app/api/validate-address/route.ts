import { NextRequest, NextResponse } from 'next/server';

interface ValidateAddressResponse {
  inputAddress: string;
  formattedAddress: string | null;
  isValid: boolean;
  addressComplete: boolean;
  hasUnconfirmedComponents: boolean;
  hasInferredComponents: boolean;
  hasReplacedComponents: boolean;
  hasSpellCorrectedComponents: boolean;
  validationGranularity: string | null;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_VALIDATION_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  let body: { address?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const address = body.address;
  if (!address || typeof address !== 'string' || !address.trim()) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const response = await fetch(
      `https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: {
            addressLines: [address.trim()],
            regionCode: 'AU',
          },
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Address validation failed', details: errorData },
        { status: response.status },
      );
    }

    const data = await response.json();
    const verdict = data.result?.verdict || {};
    const addressResult = data.result?.address || {};

    const result: ValidateAddressResponse = {
      inputAddress: address.trim(),
      formattedAddress: addressResult.formattedAddress || null,
      isValid: verdict.addressComplete === true && !verdict.hasUnconfirmedComponents,
      addressComplete: verdict.addressComplete ?? false,
      hasUnconfirmedComponents: verdict.hasUnconfirmedComponents ?? false,
      hasInferredComponents: verdict.hasInferredComponents ?? false,
      hasReplacedComponents: verdict.hasReplacedComponents ?? false,
      hasSpellCorrectedComponents: verdict.hasSpellCorrectedComponents ?? false,
      validationGranularity: verdict.validationGranularity || null,
    };

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timed out. Please try again later.' },
        { status: 408 },
      );
    }
    return NextResponse.json(
      { error: 'Address validation failed' },
      { status: 500 },
    );
  }
}
