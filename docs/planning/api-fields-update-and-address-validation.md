# TDD Plan: API Fields Update + Google Address Validation Integration

## Context

Backend API (`address-api-service`) has been updated with new response fields. Additionally, we need to integrate Google Address Validation API to validate user-entered addresses before searching, preventing invalid addresses from reaching the backend.

**Strict TDD approach**: Every feature follows RED → GREEN → REFACTOR. Tests are written and verified to fail before any production code is written.

---

## Phase 0: Test Infrastructure Setup

> This phase must be completed first. All subsequent phases depend on it.

### 0.1 — Install Vitest + React Testing Library

**Packages to install:**
```bash
npm install -D vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

> Note: Do NOT install `@types/testing-library__jest-dom` — it is deprecated. `@testing-library/jest-dom` v6+ has built-in TypeScript types.

**Create `vitest.config.ts`** (project root):
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

**Create `vitest.setup.ts`** (project root):
```typescript
/// <reference types="vitest/globals" />
import '@testing-library/jest-dom/vitest';
```

> Note: The `/// <reference types="vitest/globals" />` triple-slash directive is used here instead of adding `"types": ["vitest/globals"]` to `tsconfig.json`. Adding a `types` field to tsconfig would break automatic discovery of `@types/react`, `@types/node`, etc. and cause widespread type errors.

**Update `package.json` scripts:**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

**tsconfig.json** — NO changes needed. Do NOT add `types` field.

**Verify**: Run `npm test` — should exit with "no tests found" (not an error).

### 0.2 — Install Playwright

```bash
npm install -D @playwright/test
npx playwright install chromium
```

**Create `playwright.config.ts`** (project root):
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Create directory**: `e2e/`

**Update `package.json` scripts:**
```json
{
  "scripts": {
    "test:e2e": "playwright test"
  }
}
```

**Verify**: Run `npx playwright test` — should exit with "no tests found".

### 0.3 — Smoke test: verify infrastructure works

**Create `__tests__/smoke.test.ts`** (temporary, delete after verification):
```typescript
import { describe, it, expect } from 'vitest';

describe('Test infrastructure', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });
});
```

**Run** `npm test` — must PASS. Then delete this file.

### 0.4 — File structure for tests

```
address-search-frontend/
├── __tests__/                        # Unit + component tests (Vitest)
│   ├── components/
│   │   ├── PropertyInfoCard.test.tsx
│   │   ├── SimilarPropertiesGrid.test.tsx
│   │   ├── NearbySchoolsList.test.tsx
│   │   ├── AddressValidationDialog.test.tsx
│   │   └── SearchBar.test.tsx
│   └── api/
│       └── validate-address.test.ts
├── e2e/                              # E2E tests (Playwright)
│   └── address-search.spec.ts
├── vitest.config.ts
├── vitest.setup.ts
└── playwright.config.ts
```

---

## Phase 1: Update Components for New API Fields (TDD)

### 1.1 — PropertyInfoCard: Add GNAF fields

**File to modify**: `components/PropertyInfoCard.tsx`

#### RED: Write failing tests first

**Create `__tests__/components/PropertyInfoCard.test.tsx`:**

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PropertyInfoCard from '@/components/PropertyInfoCard';

// Factory for minimal valid PropertyInfo
function makePropertyInfo(overrides = {}) {
  return {
    address: '746 NEW SOUTH HEAD ROAD ROSE BAY NSW 2029',
    standardized_address: '746 NEW SOUTH HEAD ROAD ROSE BAY NSW 2029',
    suburb: 'ROSE BAY',
    state: 'NSW',
    postcode: '2029',
    property_type: 'Apartment',
    land_area: null,
    building_area: null,
    year_built: '',
    zoning: null,
    metro_classification: 'Sydney Metro',
    geocode_source: 'CACHED',
    latitude: -33.868,
    longitude: 151.269,
    gnaf_pid: 'GANSW710421086',
    gnaf_matched: true,
    gnaf_warning: null,
    ...overrides,
  };
}

describe('PropertyInfoCard', () => {
  // Existing fields should still render
  it('renders standardized address in header', () => {
    render(<PropertyInfoCard propertyInfo={makePropertyInfo()} />);
    expect(screen.getByText('746 NEW SOUTH HEAD ROAD ROSE BAY NSW 2029')).toBeInTheDocument();
  });

  // --- NEW: GNAF PID ---
  it('renders GNAF PID when present', () => {
    render(<PropertyInfoCard propertyInfo={makePropertyInfo({ gnaf_pid: 'GANSW710421086' })} />);
    expect(screen.getByText('GNAF PID')).toBeInTheDocument();
    expect(screen.getByText('GANSW710421086')).toBeInTheDocument();
  });

  it('renders dash for null GNAF PID', () => {
    render(<PropertyInfoCard propertyInfo={makePropertyInfo({ gnaf_pid: null })} />);
    const pidLabel = screen.getByText('GNAF PID');
    expect(pidLabel).toBeInTheDocument();
    // The InfoRow renders "—" for null values — verify in the same row
    const row = pidLabel.closest('div');
    expect(row).toHaveTextContent('—');
  });

  // --- NEW: GNAF Matched ---
  it('renders "Yes" when gnaf_matched is true', () => {
    render(<PropertyInfoCard propertyInfo={makePropertyInfo({ gnaf_matched: true })} />);
    expect(screen.getByText('GNAF Matched')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });

  it('renders "No" when gnaf_matched is false', () => {
    render(<PropertyInfoCard propertyInfo={makePropertyInfo({ gnaf_matched: false })} />);
    expect(screen.getByText('GNAF Matched')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  // --- NEW: GNAF Warning ---
  it('shows warning banner when gnaf_warning is set', () => {
    render(<PropertyInfoCard propertyInfo={makePropertyInfo({ gnaf_warning: 'Unit-level match only' })} />);
    expect(screen.getByText('Unit-level match only')).toBeInTheDocument();
  });

  it('does not show warning banner when gnaf_warning is null', () => {
    render(<PropertyInfoCard propertyInfo={makePropertyInfo({ gnaf_warning: null })} />);
    expect(screen.queryByText('Unit-level match only')).not.toBeInTheDocument();
  });

  // --- NEW: Original address subtitle ---
  it('shows original address when different from standardized', () => {
    render(<PropertyInfoCard propertyInfo={makePropertyInfo({
      address: '3/746 New South Head Road Rose Bay NSW 2029',
      standardized_address: '746 NEW SOUTH HEAD ROAD ROSE BAY NSW 2029',
    })} />);
    expect(screen.getByText(/3\/746 New South Head Road/)).toBeInTheDocument();
  });

  it('does not show original address when same as standardized', () => {
    render(<PropertyInfoCard propertyInfo={makePropertyInfo({
      address: '746 NEW SOUTH HEAD ROAD ROSE BAY NSW 2029',
      standardized_address: '746 NEW SOUTH HEAD ROAD ROSE BAY NSW 2029',
    })} />);
    // Should only appear once (in header), not as a subtitle
    const matches = screen.getAllByText('746 NEW SOUTH HEAD ROAD ROSE BAY NSW 2029');
    expect(matches.length).toBe(1);
  });
});
```

**Run**: `npm test -- PropertyInfoCard` → all new tests FAIL (RED).

#### GREEN: Implement to pass tests

1. Add `address`, `gnaf_pid`, `gnaf_matched`, `gnaf_warning` to `PropertyInfo` interface
2. Show original `address` as subtitle in header if it differs from `standardized_address`
3. Show yellow warning banner for non-null `gnaf_warning`
4. Add `InfoRow` for "GNAF PID" and "GNAF Matched" in right column

**Run**: `npm test -- PropertyInfoCard` → all tests PASS (GREEN).

#### REFACTOR

Review for duplication, clean up any unnecessary code. Tests must still pass.

---

### 1.2 — SimilarPropertiesGrid: Add suburb field

**File to modify**: `components/SimilarPropertiesGrid.tsx`

#### RED: Write failing tests first

**Create `__tests__/components/SimilarPropertiesGrid.test.tsx`:**

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SimilarPropertiesGrid from '@/components/SimilarPropertiesGrid';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function makeProperty(overrides = {}) {
  return {
    address: '1A CALEDONIAN ROAD ROSE BAY NSW',
    suburb: 'ROSE BAY',
    distance_meters: 77,
    sale_date: '2025-12-08',
    sale_price: 1925000,
    sale_method: 'Private Sale',
    bedrooms: 2,
    bathrooms: 1,
    car_spaces: null,
    land_area: null,
    building_area: null,
    property_type: 'Apartment',
    ...overrides,
  };
}

describe('SimilarPropertiesGrid', () => {
  it('renders suburb below address', () => {
    render(<SimilarPropertiesGrid properties={[makeProperty({ suburb: 'ROSE BAY' })]} />);
    expect(screen.getByText('ROSE BAY')).toBeInTheDocument();
  });

  it('does not render suburb when empty', () => {
    render(<SimilarPropertiesGrid properties={[makeProperty({ suburb: '' })]} />);
    expect(screen.getByText('1A CALEDONIAN ROAD ROSE BAY NSW')).toBeInTheDocument();
    expect(screen.queryByText(/^ROSE BAY$/)).not.toBeInTheDocument();
  });

  it('does not render suburb when null', () => {
    render(<SimilarPropertiesGrid properties={[makeProperty({ suburb: null })]} />);
    expect(screen.getByText('1A CALEDONIAN ROAD ROSE BAY NSW')).toBeInTheDocument();
  });
});
```

**Run**: `npm test -- SimilarPropertiesGrid` → FAIL (RED).

#### GREEN: Implement

1. Add `suburb?: string | null` to `SimilarProperty` interface
2. Render suburb as `<p className="text-xs text-gray-500 mt-0.5">` below address

**Run**: `npm test -- SimilarPropertiesGrid` → PASS (GREEN).

---

### 1.3 — NearbySchoolsList: Add suburb field

**File to modify**: `components/NearbySchoolsList.tsx`

#### RED: Write failing tests first

**Create `__tests__/components/NearbySchoolsList.test.tsx`:**

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import NearbySchoolsList from '@/components/NearbySchoolsList';

function makeSchool(overrides = {}) {
  return {
    school_name: 'Rose Bay Public School',
    school_type: 'Primary',
    school_sector: 'Government',
    suburb: 'ROSE BAY',
    distance_meters: 527,
    rating_overall: null,
    rating_academic: null,
    phone: null,
    website_url: null,
    ...overrides,
  };
}

describe('NearbySchoolsList', () => {
  it('renders suburb below school name', () => {
    render(<NearbySchoolsList schools={[makeSchool({ suburb: 'ROSE BAY' })]} />);
    expect(screen.getByText('ROSE BAY')).toBeInTheDocument();
  });

  it('does not render suburb when empty', () => {
    render(<NearbySchoolsList schools={[makeSchool({ suburb: '' })]} />);
    expect(screen.getByText('Rose Bay Public School')).toBeInTheDocument();
  });

  it('does not render suburb when null', () => {
    render(<NearbySchoolsList schools={[makeSchool({ suburb: null })]} />);
    expect(screen.getByText('Rose Bay Public School')).toBeInTheDocument();
  });
});
```

**Run**: `npm test -- NearbySchoolsList` → FAIL (RED).

#### GREEN: Implement

1. Add `suburb?: string | null` to `School` interface
2. Render suburb below school name and badges

**Run**: `npm test -- NearbySchoolsList` → PASS (GREEN).

---

### Phase 1 Gate

```bash
npm test          # All component tests pass
npm run build     # No type errors
npm run lint      # No lint errors
```

---

## Phase 2: Google Address Validation API Integration (TDD)

### 2.0 — Prerequisites

```bash
npx shadcn@latest add dialog    # Install shadcn Dialog → components/ui/dialog.tsx
```

Enable **Address Validation API** in Google Cloud Console (same project as Maps JS API).

Add new server-only environment variable:

| Variable | Scope | Purpose |
|---|---|---|
| `GOOGLE_VALIDATION_API_KEY` | Server only | Address Validation API key (paid API, IP-restricted) |

> **Why a separate key?** Address Validation API is billed per request. Using a server-only key (not `NEXT_PUBLIC_`) prevents client-side exposure. Configure IP restriction in Google Cloud Console for this key.

---

### 2.1 — API Route: `/api/validate-address`

**New file**: `app/api/validate-address/route.ts`

#### Google Address Validation API Response Structure (from official docs)

```json
{
  "result": {
    "verdict": {
      "inputGranularity": "SUB_PREMISE",
      "validationGranularity": "PREMISE",
      "geocodeGranularity": "PREMISE",
      "addressComplete": true,
      "hasUnconfirmedComponents": false,
      "hasInferredComponents": true,
      "hasReplacedComponents": false,
      "hasSpellCorrectedComponents": false
    },
    "address": {
      "formattedAddress": "10 Smith Street, Melbourne VIC 3000, Australia",
      "postalAddress": { "..." : "..." },
      "addressComponents": [ "..." ],
      "missingComponentTypes": [],
      "unconfirmedComponentTypes": [],
      "unresolvedTokens": []
    },
    "geocode": { "location": { "latitude": -37.814, "longitude": 144.963 } },
    "metadata": { "business": false, "poBox": false, "residential": true }
  },
  "responseId": "uuid-string"
}
```

#### Flattened Response Contract

Our API route flattens the Google response. **`isValid` is a derived field**, not from Google directly:

```typescript
interface ValidateAddressResponse {
  inputAddress: string;
  formattedAddress: string | null;
  // Derived: addressComplete === true && !hasUnconfirmedComponents
  isValid: boolean;
  // Transparently forwarded from verdict:
  addressComplete: boolean;
  hasUnconfirmedComponents: boolean;
  hasInferredComponents: boolean;
  hasReplacedComponents: boolean;
  hasSpellCorrectedComponents: boolean;
  validationGranularity: string | null;
}
```

**`isValid` derivation formula:**
```typescript
const isValid = verdict.addressComplete === true
  && !verdict.hasUnconfirmedComponents;
```

#### API Contract

**Request:**
```
POST /api/validate-address
Content-Type: application/json
Body: { "address": "3/746 New South Head Road Rose Bay NSW 2029" }
```

**Response (valid, no correction):**
```json
{
  "inputAddress": "10 Smith Street Melbourne VIC 3000",
  "formattedAddress": "10 Smith Street, Melbourne VIC 3000, Australia",
  "isValid": true,
  "addressComplete": true,
  "hasUnconfirmedComponents": false,
  "hasInferredComponents": false,
  "hasReplacedComponents": false,
  "hasSpellCorrectedComponents": false,
  "validationGranularity": "PREMISE"
}
```

**Response (spell-corrected):**
```json
{
  "inputAddress": "10 Smth Stret Melborne",
  "formattedAddress": "10 Smith Street, Melbourne VIC 3000, Australia",
  "isValid": true,
  "addressComplete": true,
  "hasUnconfirmedComponents": false,
  "hasInferredComponents": true,
  "hasReplacedComponents": false,
  "hasSpellCorrectedComponents": true,
  "validationGranularity": "PREMISE"
}
```

**Response (invalid):**
```json
{
  "inputAddress": "asdfasdf",
  "formattedAddress": null,
  "isValid": false,
  "addressComplete": false,
  "hasUnconfirmedComponents": true,
  "hasInferredComponents": false,
  "hasReplacedComponents": false,
  "hasSpellCorrectedComponents": false,
  "validationGranularity": "OTHER"
}
```

**Response (error):**
```json
{ "error": "Address validation failed" }
```

#### RED: Write failing tests first

**Create `__tests__/api/validate-address.test.ts`:**

```typescript
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
```

**Run**: `npm test -- validate-address` → FAIL (RED) — file doesn't exist yet.

#### GREEN: Implement

**Create `app/api/validate-address/route.ts`** following the pattern from `app/api/geocode/route.ts`:

- POST handler, parse JSON body, validate `address` field
- Read `GOOGLE_VALIDATION_API_KEY` (server-only, NOT `NEXT_PUBLIC_`)
- Call `https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`
- Payload: `{ address: { addressLines: [address], regionCode: 'AU' } }`
- Derive `isValid`: `verdict.addressComplete === true && !verdict.hasUnconfirmedComponents`
- Flatten response to `ValidateAddressResponse` interface (including `addressComplete`, `hasSpellCorrectedComponents`)
- 10s timeout with AbortController
- Error handling: 400 (bad body), 500 (missing key), 408 (timeout)

**Run**: `npm test -- validate-address` → PASS (GREEN).

---

### 2.2 — AddressValidationDialog Component

**New file**: `components/AddressValidationDialog.tsx`

#### RED: Write failing tests first

**Create `__tests__/components/AddressValidationDialog.test.tsx`:**

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import AddressValidationDialog from '@/components/AddressValidationDialog';

describe('AddressValidationDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    originalAddress: '10 Smith St Melbourne',
    correctedAddress: '10 Smith Street, Melbourne VIC 3000, Australia',
    onSelectOriginal: vi.fn(),
    onSelectCorrected: vi.fn(),
  };

  it('renders both address options when open', () => {
    render(<AddressValidationDialog {...defaultProps} />);
    expect(screen.getByText('10 Smith St Melbourne')).toBeInTheDocument();
    expect(screen.getByText('10 Smith Street, Melbourne VIC 3000, Australia')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    render(<AddressValidationDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('10 Smith St Melbourne')).not.toBeInTheDocument();
  });

  it('calls onSelectCorrected when clicking suggested address', async () => {
    const onSelectCorrected = vi.fn();
    render(<AddressValidationDialog {...defaultProps} onSelectCorrected={onSelectCorrected} />);

    await userEvent.click(screen.getByText(/Suggested address/i).closest('button')!);
    expect(onSelectCorrected).toHaveBeenCalledOnce();
  });

  it('calls onSelectOriginal when clicking keep original', async () => {
    const onSelectOriginal = vi.fn();
    render(<AddressValidationDialog {...defaultProps} onSelectOriginal={onSelectOriginal} />);

    await userEvent.click(screen.getByText(/Keep original/i).closest('button')!);
    expect(onSelectOriginal).toHaveBeenCalledOnce();
  });
});
```

**Run**: `npm test -- AddressValidationDialog` → FAIL (RED).

#### GREEN: Implement

**Create `components/AddressValidationDialog.tsx`:**
- `'use client'` directive
- Uses shadcn `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`
- Two clickable buttons: "Suggested address" (blue-highlighted) and "Keep original" (gray)
- SVG icons only, navy blue accent (`#1d4ed8`)

**Run**: `npm test -- AddressValidationDialog` → PASS (GREEN).

---

### 2.3 — SearchBar: Validation-First Search Flow

**File to modify**: `components/SearchBar.tsx`

#### Current Behavior (lines 75-79)

```typescript
const handleSearch = () => {
  if (!address.trim()) return;
  setShowSuggestions(false);
  router.push(`/property?address=${encodeURIComponent(address.trim())}`);
};
```

#### New Behavior — Flag-Based Decision Logic

> **Important**: Do NOT use string comparison (normalize) to decide whether to show the correction dialog. Google's `formattedAddress` will almost always differ from user input (adds `, Australia`, commas, abbreviation changes). Use the verdict flag fields instead.

```
User clicks Search / presses Enter
  → Abort any in-flight validation request (AbortController)
  → setIsValidating(true), disable button, clear previous error
  → POST /api/validate-address { address }

  → IF response error OR network failure:
      → Fail open: navigate directly with original address

  → IF !isValid OR !formattedAddress:
      → Show inline error "This address could not be validated"

  → IF hasReplacedComponents OR hasSpellCorrectedComponents:
      → Open AddressValidationDialog (show corrected vs original)
      → User picks corrected → navigate with formattedAddress
      → User picks original → navigate with original address

  → ELSE (valid, no corrections):
      → Navigate directly to /property?address={formattedAddress}

  → setIsValidating(false)
```

#### New State Variables

```typescript
const [isValidating, setIsValidating] = useState(false);
const [validationError, setValidationError] = useState<string | null>(null);
const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
const [correctedAddress, setCorrectedAddress] = useState<string | null>(null);
const [pendingOriginalAddress, setPendingOriginalAddress] = useState('');
const abortControllerRef = useRef<AbortController | null>(null);
```

#### Race Condition Prevention

```typescript
const handleSearch = async () => {
  // Cancel previous in-flight request
  abortControllerRef.current?.abort();
  const controller = new AbortController();
  abortControllerRef.current = controller;

  try {
    const res = await fetch('/api/validate-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: trimmed }),
      signal: controller.signal,
    });
    // ... handle response
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return; // Cancelled, ignore
    navigateToProperty(trimmed); // Fail open
  }
};
```

#### RED: Write failing tests first

**Create `__tests__/components/SearchBar.test.tsx`:**

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SearchBar from '@/components/SearchBar';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock global google object (prevent autocomplete errors)
vi.stubGlobal('google', undefined);

// Mock fetch for /api/validate-address
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Full validation response factory
function makeValidationResponse(overrides = {}) {
  return {
    ok: true,
    json: async () => ({
      formattedAddress: '10 Smith Street, Melbourne VIC 3000, Australia',
      isValid: true,
      addressComplete: true,
      hasUnconfirmedComponents: false,
      hasInferredComponents: false,
      hasReplacedComponents: false,
      hasSpellCorrectedComponents: false,
      ...overrides,
    }),
  };
}

describe('SearchBar validation flow', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetch.mockReset();
  });

  it('calls validate-address API before navigating', async () => {
    mockFetch.mockResolvedValueOnce(makeValidationResponse());

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, '10 Smith Street Melbourne VIC 3000');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/validate-address', expect.any(Object));
    });
  });

  it('navigates directly when valid and no corrections', async () => {
    mockFetch.mockResolvedValueOnce(makeValidationResponse({
      hasReplacedComponents: false,
      hasSpellCorrectedComponents: false,
    }));

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, '10 Smith Street Melbourne VIC 3000');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/property?address=')
      );
    });
  });

  it('shows correction dialog when hasSpellCorrectedComponents is true', async () => {
    mockFetch.mockResolvedValueOnce(makeValidationResponse({
      hasSpellCorrectedComponents: true,
    }));

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, '10 Smth Stret Melborne');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/Suggested address/i)).toBeInTheDocument();
    });
    // Should NOT navigate yet
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows correction dialog when hasReplacedComponents is true', async () => {
    mockFetch.mockResolvedValueOnce(makeValidationResponse({
      hasReplacedComponents: true,
    }));

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, '999 Wrong Street Melbourne');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/Suggested address/i)).toBeInTheDocument();
    });
  });

  it('shows error when isValid is false', async () => {
    mockFetch.mockResolvedValueOnce(makeValidationResponse({
      isValid: false,
      addressComplete: false,
      formattedAddress: null,
    }));

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, 'asdfasdf');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/could not be validated/i)).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows error when formattedAddress is null even if partially valid', async () => {
    mockFetch.mockResolvedValueOnce(makeValidationResponse({
      isValid: false,
      addressComplete: false,
      formattedAddress: null,
      hasUnconfirmedComponents: true,
    }));

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, 'partial addr');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/could not be validated/i)).toBeInTheDocument();
    });
  });

  it('fails open on network error — navigates with original address', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, '10 Smith Street Melbourne');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
  });

  it('fails open on non-OK response — navigates with original address', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, '10 Smith Street Melbourne');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
  });

  it('does not call API for empty input', async () => {
    render(<SearchBar variant="hero" />);
    await userEvent.click(screen.getByRole('button'));

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('disables search button while validating', async () => {
    // Make fetch hang (never resolve)
    mockFetch.mockReturnValueOnce(new Promise(() => {}));

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, '10 Smith Street Melbourne');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  // --- Dialog selection → navigation ---
  it('navigates with corrected address when user selects "Suggested address"', async () => {
    mockFetch.mockResolvedValueOnce(makeValidationResponse({
      hasSpellCorrectedComponents: true,
      formattedAddress: '10 Smith Street, Melbourne VIC 3000, Australia',
    }));

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, '10 Smth Stret Melborne');
    await userEvent.click(screen.getByRole('button'));

    // Wait for dialog to appear
    await waitFor(() => {
      expect(screen.getByText(/Suggested address/i)).toBeInTheDocument();
    });

    // Click "Suggested address"
    await userEvent.click(screen.getByText(/Suggested address/i).closest('button')!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('10 Smith Street, Melbourne VIC 3000, Australia'))
      );
    });
  });

  it('navigates with original address when user selects "Keep original"', async () => {
    mockFetch.mockResolvedValueOnce(makeValidationResponse({
      hasReplacedComponents: true,
      formattedAddress: '10 Smith Street, Melbourne VIC 3000, Australia',
    }));

    render(<SearchBar variant="hero" />);
    const input = screen.getByPlaceholderText(/Australian property address/i);
    await userEvent.type(input, '999 Wrong Street Melbourne');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/Keep original/i)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText(/Keep original/i).closest('button')!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('999 Wrong Street Melbourne'))
      );
    });
  });

  // --- Nav variant ---
  it('nav variant: validates and navigates on search', async () => {
    mockFetch.mockResolvedValueOnce(makeValidationResponse());

    render(<SearchBar variant="nav" />);
    const input = screen.getByPlaceholderText(/Search address/i);
    await userEvent.type(input, '10 Smith Street Melbourne VIC 3000');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/validate-address', expect.any(Object));
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/property?address=')
      );
    });
  });
});
```

**Run**: `npm test -- SearchBar` → FAIL (RED).

#### GREEN: Implement

Modify `components/SearchBar.tsx`:

1. Add state + `abortControllerRef`
2. Extract `navigateToProperty(addr: string)` helper
3. Rewrite `handleSearch` as async with flag-based validation flow:
   - Cancel previous request via `abortControllerRef.current?.abort()`
   - If `!isValid || !formattedAddress` → show error
   - If `hasReplacedComponents || hasSpellCorrectedComponents` → show dialog
   - Else → navigate with `formattedAddress`
   - On error/network failure → fail open
   - On abort → silently ignore
4. Disable button + show spinner while `isValidating`
5. Show red error text for `validationError`
6. Render `AddressValidationDialog` at component end

**Run**: `npm test -- SearchBar` → PASS (GREEN).

---

### Phase 2 Gate

```bash
npm test          # All tests pass (components + API route)
npm run build     # No type errors
npm run lint      # No lint errors
```

---

## Phase 3: E2E Tests (Playwright)

> **Important: Local-only tests.** These E2E tests require:
> - A running backend (`ADDRESS_API_URL` reachable)
> - A valid `GOOGLE_VALIDATION_API_KEY`
> - All env vars configured in `.env.local`
>
> These tests are NOT suitable for CI without API mocking. For CI integration in the future, use Playwright's `page.route()` to mock external API responses.

### 3.1 — Address Search Flow E2E

**Create `e2e/address-search.spec.ts`:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Address search flow', () => {
  test('homepage loads with search bar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholderText(/Australian property address/i)).toBeVisible();
  });

  test('search with valid address navigates to property page', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholderText(/Australian property address/i).fill('746 New South Head Road Rose Bay NSW 2029');
    await page.getByRole('button', { name: /search/i }).click();

    // Should navigate to property page
    await expect(page).toHaveURL(/\/property\?address=/, { timeout: 15000 });
  });

  test('property page displays GNAF fields', async ({ page }) => {
    await page.goto('/property?address=746+NEW+SOUTH+HEAD+ROAD+ROSE+BAY+NSW+2029');

    await expect(page.getByText('Property Information')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('GNAF PID')).toBeVisible();
    await expect(page.getByText('GNAF Matched')).toBeVisible();
  });

  test('property page displays suburb in similar properties', async ({ page }) => {
    await page.goto('/property?address=746+NEW+SOUTH+HEAD+ROAD+ROSE+BAY+NSW+2029');
    await expect(page.getByText('Nearby Similar Properties')).toBeVisible({ timeout: 15000 });
  });

  test('property page displays suburb in nearby schools', async ({ page }) => {
    await page.goto('/property?address=746+NEW+SOUTH+HEAD+ROAD+ROSE+BAY+NSW+2029');
    await expect(page.getByText('Nearby Schools')).toBeVisible({ timeout: 15000 });
  });

  test('invalid address shows validation error', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholderText(/Australian property address/i).fill('xyzzy123nonsense');
    await page.getByRole('button', { name: /search/i }).click();

    await expect(page.getByText(/could not be validated/i)).toBeVisible({ timeout: 10000 });
  });
});
```

**Run**: `npm run test:e2e` — all E2E tests should pass.

---

## File Change Summary

| Action | File | Phase |
|--------|------|-------|
| **Install** | `vitest`, `@testing-library/*`, `@playwright/test` | Phase 0 |
| **Create** | `vitest.config.ts` | Phase 0 |
| **Create** | `vitest.setup.ts` | Phase 0 |
| **Create** | `playwright.config.ts` | Phase 0 |
| **Modify** | `package.json` (add scripts + devDeps) | Phase 0 |
| **Create** | `__tests__/components/PropertyInfoCard.test.tsx` | Phase 1.1 RED |
| **Modify** | `components/PropertyInfoCard.tsx` | Phase 1.1 GREEN |
| **Create** | `__tests__/components/SimilarPropertiesGrid.test.tsx` | Phase 1.2 RED |
| **Modify** | `components/SimilarPropertiesGrid.tsx` | Phase 1.2 GREEN |
| **Create** | `__tests__/components/NearbySchoolsList.test.tsx` | Phase 1.3 RED |
| **Modify** | `components/NearbySchoolsList.tsx` | Phase 1.3 GREEN |
| **Install** | `npx shadcn@latest add dialog` → `components/ui/dialog.tsx` | Phase 2.0 |
| **Create** | `__tests__/api/validate-address.test.ts` | Phase 2.1 RED |
| **Create** | `app/api/validate-address/route.ts` | Phase 2.1 GREEN |
| **Create** | `__tests__/components/AddressValidationDialog.test.tsx` | Phase 2.2 RED |
| **Create** | `components/AddressValidationDialog.tsx` | Phase 2.2 GREEN |
| **Create** | `__tests__/components/SearchBar.test.tsx` | Phase 2.3 RED |
| **Modify** | `components/SearchBar.tsx` | Phase 2.3 GREEN |
| **Modify** | `CLAUDE.md` | Phase 2 docs |
| **Create** | `e2e/address-search.spec.ts` | Phase 3 |

---

## Environment Variables Update

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Client | Maps JS API + Places API (existing) |
| `ADDRESS_API_URL` | Server | Backend base URL (existing) |
| `ADDRESS_API_KEY` | Server | Backend X-API-Key header (existing) |
| `GOOGLE_VALIDATION_API_KEY` | Server | Address Validation API key (NEW, IP-restricted) |

---

## CLAUDE.md Documentation Updates

Add to Data Flow section:
```
Browser → /api/validate-address (Next.js) → addressvalidation.googleapis.com/v1:validateAddress
```

Add to Environment Variables table:
```
| `GOOGLE_VALIDATION_API_KEY` | Server | Address Validation API key (paid, IP-restricted) |
```

Add to Google Maps Integration section:
```
- **Address Validation**: Proxied through `/api/validate-address`. Uses flag-based logic (hasReplacedComponents / hasSpellCorrectedComponents) to decide correction dialog. Falls open on API failure.
```

Add to notes:
```
Google Cloud project must also have **Address Validation API** enabled.
```

---

## Execution Checklist

### Phase 0: Infrastructure
- [ ] Install Vitest + React Testing Library
- [ ] Create `vitest.config.ts` + `vitest.setup.ts`
- [ ] Install Playwright + `playwright.config.ts`
- [ ] Update `package.json` scripts
- [ ] Verify: `npm test` runs (no tests found is OK)

### Phase 1: API Field Updates (RED → GREEN per feature)
- [ ] **1.1 RED**: Write PropertyInfoCard tests → verify FAIL
- [ ] **1.1 GREEN**: Implement PropertyInfoCard changes → verify PASS
- [ ] **1.2 RED**: Write SimilarPropertiesGrid tests → verify FAIL
- [ ] **1.2 GREEN**: Implement SimilarPropertiesGrid changes → verify PASS
- [ ] **1.3 RED**: Write NearbySchoolsList tests → verify FAIL
- [ ] **1.3 GREEN**: Implement NearbySchoolsList changes → verify PASS
- [ ] Gate: `npm test && npm run build && npm run lint`

### Phase 2: Address Validation (RED → GREEN per feature)
- [ ] **2.0**: Install shadcn Dialog + add `GOOGLE_VALIDATION_API_KEY` to `.env.local`
- [ ] **2.1 RED**: Write validate-address API tests → verify FAIL
- [ ] **2.1 GREEN**: Implement API route → verify PASS
- [ ] **2.2 RED**: Write AddressValidationDialog tests → verify FAIL
- [ ] **2.2 GREEN**: Implement dialog component → verify PASS
- [ ] **2.3 RED**: Write SearchBar validation tests → verify FAIL
- [ ] **2.3 GREEN**: Implement SearchBar changes → verify PASS
- [ ] Gate: `npm test && npm run build && npm run lint`

### Phase 3: E2E
- [ ] Write Playwright E2E tests
- [ ] Run `npm run test:e2e` → all pass
- [ ] Update CLAUDE.md documentation
