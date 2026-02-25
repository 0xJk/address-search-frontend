# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js)
npm run build    # Production build
npm run lint     # ESLint
npm test         # Unit tests (Vitest)
npm run test:watch    # Unit tests in watch mode
npm run test:e2e      # E2E tests (Playwright, requires running backend + env vars)
```

## Architecture

**PropSearch AU** — a Next.js frontend for browsing Australian property data from a private FastAPI backend (`address-api-service`).

### Data Flow

All backend calls are proxied through Next.js Route Handlers to keep the API key server-side:

```
Browser → /api/property         (Next.js) → ADDRESS_API_URL/api/v1/property/search
Browser → /api/geocode          (Next.js) → ADDRESS_API_URL/api/v1/geocode
Browser → /api/validate-address (Next.js) → addressvalidation.googleapis.com/v1:validateAddress
```

- `app/property/page.tsx` is a **server component** — it fetches data directly from the backend env var, not through the proxy route
- `app/geocode/page.tsx` is a **client component** — it calls the `/api/geocode` proxy
- `app/api/*/route.ts` — proxy handlers inject `X-API-Key` from env and enforce a 30s timeout

### Key Component Relationships

`SearchBar` has two modes (`variant="hero"` | `variant="nav"`) — hero is used on the homepage, nav is embedded in `Navbar` on the property page. Both modes integrate Google Places Autocomplete restricted to `country: 'au'`.

The property detail page (`/property?address=xxx`) assembles seven sections in order: map → info card → sale history → similar properties → schools → transport placeholder → raw JSON viewer.

### Google Maps Integration

- **Script loading**: Global `<Script>` tag in `app/layout.tsx` with `&v=weekly&loading=async` (no `&libraries=places`)
- **Library loading**: All libraries loaded dynamically via `google.maps.importLibrary()` — never rely on pre-bundled libraries
- **Markers**: Use `AdvancedMarkerElement` (from `importLibrary('marker')`), NOT the deprecated `google.maps.Marker`. Maps require `mapId: 'DEMO_MAP_ID'` (replace with a real Map ID from Google Cloud Console for production)
- **Autocomplete**: Load via `importLibrary('places')` then `new Autocomplete(inputRef, options)`
- **Address Validation**: Proxied through `/api/validate-address`. Uses flag-based logic (`hasReplacedComponents` / `hasSpellCorrectedComponents`) to decide correction dialog. Falls open on API failure.

### Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Client | Maps JS API + Places API (New) |
| `ADDRESS_API_URL` | Server | Backend base URL |
| `ADDRESS_API_KEY` | Server | Backend `X-API-Key` header |
| `GOOGLE_VALIDATION_API_KEY` | Server | Address Validation API key (paid, IP-restricted) |

The Google Cloud project must have **Places API (New)**, **Maps JavaScript API**, and **Address Validation API** enabled — NOT the legacy versions.

## UI Conventions

From the product design spec:
- **Primary accent**: Navy blue (`#1d4ed8` / `#1e3a5f`)
- **Icons**: SVG only — no emoji anywhere
- **Null field display**: `null` prices → "Contact Agent"; `null`/`""` for `year_built` → "—" (use `!year_built`); `null` areas → "—"
- **`geocode_source`** display: `GNAF` or `CACHED` → show "GNAF"; `GOOGLE_API` → show "Google"
- **School ratings** (`rating_overall`, `rating_academic`) are currently all `null` — do not render the ratings UI
- Map height is fixed at **450px**
- Sale history sorted descending by `sale_date`
- Deployment target: **Vercel** (env vars managed via Vercel Dashboard)
