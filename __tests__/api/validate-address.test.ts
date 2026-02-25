import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/validate-address/route';
import { NextRequest } from 'next/server';

// Helper: create a NextRequest with JSON body
function makeRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/validate-address', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Full Google API mock response factory
function makeGoogleResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    json: async () => ({
      result: {
        verdict: {
          addressComplete: true,
          validationGranularity: 'PREMISE',
          hasUnconfirmedComponents: false,
          hasInferredComponents: false,
          hasReplacedComponents: false,
          hasSpellCorrectedComponents: false,
          ...overrides.verdict as object,
        },
        address: {
          formattedAddress: '10 Smith Street, Melbourne VIC 3000, Australia',
          ...overrides.address as object,
        },
      },
    }),
  };
}

// Mock global fetch for Google API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('POST /api/validate-address', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_VALIDATION_API_KEY', 'test-server-api-key');
    mockFetch.mockReset();
  });

  it('returns formatted address for valid input', async () => {
    mockFetch.mockResolvedValueOnce(makeGoogleResponse());

    const response = await POST(makeRequest({ address: '10 Smith Street Melbourne VIC 3000' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.formattedAddress).toBe('10 Smith Street, Melbourne VIC 3000, Australia');
    expect(data.isValid).toBe(true);
    expect(data.addressComplete).toBe(true);
    expect(data.hasSpellCorrectedComponents).toBe(false);
    expect(data.hasReplacedComponents).toBe(false);
  });

  it('returns isValid=false when addressComplete is false', async () => {
    mockFetch.mockResolvedValueOnce(makeGoogleResponse({
      verdict: { addressComplete: false, hasUnconfirmedComponents: true },
    }));

    const response = await POST(makeRequest({ address: 'partial address' }));
    const data = await response.json();

    expect(data.isValid).toBe(false);
    expect(data.addressComplete).toBe(false);
  });

  it('returns isValid=false when hasUnconfirmedComponents is true', async () => {
    mockFetch.mockResolvedValueOnce(makeGoogleResponse({
      verdict: { addressComplete: true, hasUnconfirmedComponents: true },
    }));

    const response = await POST(makeRequest({ address: 'ambiguous address' }));
    const data = await response.json();

    expect(data.isValid).toBe(false);
  });

  it('returns hasSpellCorrectedComponents when Google spell-corrects', async () => {
    mockFetch.mockResolvedValueOnce(makeGoogleResponse({
      verdict: { hasSpellCorrectedComponents: true },
      address: { formattedAddress: '10 Smith Street, Melbourne VIC 3000, Australia' },
    }));

    const response = await POST(makeRequest({ address: '10 Smth Stret Melborne' }));
    const data = await response.json();

    expect(data.hasSpellCorrectedComponents).toBe(true);
    expect(data.formattedAddress).toBe('10 Smith Street, Melbourne VIC 3000, Australia');
  });

  it('returns hasReplacedComponents when Google replaces components', async () => {
    mockFetch.mockResolvedValueOnce(makeGoogleResponse({
      verdict: { hasReplacedComponents: true },
    }));

    const response = await POST(makeRequest({ address: 'wrong number Smith St' }));
    const data = await response.json();

    expect(data.hasReplacedComponents).toBe(true);
  });

  it('returns 400 when address is missing', async () => {
    const response = await POST(makeRequest({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Address is required');
  });

  it('returns 400 for malformed body', async () => {
    const request = new NextRequest('http://localhost:3000/api/validate-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 500 when API key is missing', async () => {
    vi.stubEnv('GOOGLE_VALIDATION_API_KEY', '');

    const response = await POST(makeRequest({ address: 'test' }));
    expect(response.status).toBe(500);
  });

  it('returns upstream error status on Google API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'forbidden' }),
    });

    const response = await POST(makeRequest({ address: 'test' }));
    expect(response.status).toBe(403);
  });

  it('calls Google API with correct payload and server-only key', async () => {
    mockFetch.mockResolvedValueOnce(makeGoogleResponse());

    await POST(makeRequest({ address: '10 Smith St' }));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('addressvalidation.googleapis.com'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"addressLines":["10 Smith St"]'),
      }),
    );
    // Verify server-only key is used (not NEXT_PUBLIC_)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('key=test-server-api-key'),
      expect.any(Object),
    );
  });
});
