// Golf Intelligence API client
// Base URL: https://api.golfintelligence.com
// Auth: exchange static API token for a short-lived Bearer access token, then
//       pass Authorization: Bearer <accessToken> on every subsequent request.
//
// Credit costs:
//   searchCourseGroups   – 0
//   getSlopeImage        – 1
//   getElevationImage    – 1
//   getCourseGroupScorecard – 1  (used to resolve holeIds)

// In the native Capacitor iOS build the WebView makes requests from
// capacitor://localhost, which the GI API's CORS policy blocks.
// We route through a Vite dev-server proxy (/gi-api → api.golfintelligence.com)
// for browser-based testing.  In the Capacitor build we'll switch to the
// @capacitor/http native plugin (no CORS), but for now the proxy covers dev.
const IS_CAPACITOR = !!(window as unknown as Record<string, unknown>).Capacitor;
const BASE = IS_CAPACITOR
  ? 'https://api.golfintelligence.com'
  : '/gi-api';
const API_TOKEN = import.meta.env.VITE_GI_API_TOKEN as string;
const CLIENT_ID = import.meta.env.VITE_GI_CLIENT_ID as string;

// ── Auth ──────────────────────────────────────────────────────────────────────

interface TokenCache {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Date.now() ms
}

let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.accessToken;
  }

  // Try refresh first if we have a refresh token
  if (tokenCache?.refreshToken) {
    try {
      const token = await refreshAccessToken(tokenCache.refreshToken);
      if (token) return token;
    } catch {
      // fall through to full re-auth
    }
  }

  return authenticateToken();
}

async function authenticateToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    code: API_TOKEN,
    client_id: CLIENT_ID,
  });

  const res = await fetch(`${BASE}/auth/authenticateToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) throw new Error(`GI auth failed: ${res.status}`);

  const data = await res.json();
  tokenCache = {
    accessToken: data.access_token ?? data.accessToken,
    refreshToken: data.refresh_token ?? data.refreshToken ?? '',
    // API doesn't document expiry; assume 1 hour
    expiresAt: Date.now() + (data.expires_in ? data.expires_in * 1000 : 3_600_000),
  };
  return tokenCache.accessToken;
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch(`${BASE}/auth/authenticateToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) return null;

  const data = await res.json();
  tokenCache = {
    accessToken: data.access_token ?? data.accessToken,
    refreshToken: data.refresh_token ?? data.refreshToken ?? refreshToken,
    expiresAt: Date.now() + (data.expires_in ? data.expires_in * 1000 : 3_600_000),
  };
  return tokenCache.accessToken;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  return { Authorization: `Bearer ${token}` };
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CourseSearchResult {
  publicId: string;
  name: string;
  city: string;
  stateCode: string;
  countryCode: string;
}

export interface ScoringHole {
  holeId: number;
  holeNumber: number;
  par: number;
}

export interface GreenRenderDetail {
  imageUrl: string;
  /** Meters per pixel in the original 900×1620 image space */
  meterToPixelScale: number;
  /** Real-world compass bearing (radians) that image-up points toward */
  heading: number;
}

// ── Course search ─────────────────────────────────────────────────────────────

export async function searchCourseGroups(
  keywords: string,
  countryCode = 'US',
): Promise<CourseSearchResult[]> {
  const headers = await authHeaders();

  const res = await fetch(`${BASE}/courses/searchCourseGroups`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rows: 20,
      offset: 0,
      keywords,
      countryCode,
      regionCode: null,
      gpsCoordinate: null,
    }),
  });

  if (!res.ok) throw new Error(`GI course search failed: ${res.status}`);

  const data = await res.json();

  // Response shape: { data: CourseGroupSearchDto[] }
  const raw: RawCourseGroupSearchDto[] = Array.isArray(data) ? data : (data.data ?? []);
  return raw.map(r => ({
    publicId: r.publicId,
    name: r.name ?? r.facility?.facilityName ?? '',
    city: r.facility?.address?.city ?? '',
    stateCode: r.facility?.address?.region ?? '',
    countryCode: r.facility?.address?.countryCode ?? '',
  }));
}

// Raw DTO shapes (loose — we only pick what we need)
interface RawCourseGroupSearchDto {
  publicId: string;
  name?: string;
  facility?: {
    facilityName?: string;
    address?: { city?: string; region?: string; countryCode?: string };
  };
}

// ── Scorecard (to get holeIds) ────────────────────────────────────────────────

// Cache scorecard lookups so we don't re-spend credits on navigation
const scorecardCache = new Map<string, ScoringHole[]>();

export async function getCourseHoles(publicId: string): Promise<ScoringHole[]> {
  if (scorecardCache.has(publicId)) return scorecardCache.get(publicId)!;

  const headers = await authHeaders();
  const res = await fetch(
    `${BASE}/courses/getCourseGroupScorecard?publicId=${encodeURIComponent(publicId)}`,
    { headers },
  );

  if (!res.ok) throw new Error(`GI scorecard failed: ${res.status}`);

  const data = await res.json();

  // Shape: ScoringCourseGroupDto → courses[] → tees[] → holes[]
  const holes: ScoringHole[] = [];
  const courses: RawScoringCourseDto[] = data.courses ?? [];
  for (const course of courses) {
    for (const tee of course.tees ?? []) {
      for (const hole of tee.holes ?? []) {
        // Avoid duplicates — multiple tee sets share the same holeNumber/holeId
        if (!holes.find(h => h.holeNumber === hole.holeNumber)) {
          holes.push({
            holeId: hole.holeId,
            holeNumber: hole.holeNumber,
            par: hole.par ?? 4,
          });
        }
      }
    }
  }

  holes.sort((a, b) => a.holeNumber - b.holeNumber);
  scorecardCache.set(publicId, holes);
  return holes;
}

interface RawScoringCourseDto {
  tees?: { holes?: { holeId: number; holeNumber: number; par?: number }[] }[];
}

// ── Green images ──────────────────────────────────────────────────────────────

// ── Persistent green image cache ──────────────────────────────��──────────────
// Signed CloudFront URLs expire in ~1 year. We persist them in localStorage
// so reloading the app doesn't re-spend credits. On expiry the entry is
// evicted and a fresh API call is made.

const LS_GREEN_CACHE = 'gi-green-cache-v1';

interface PersistedDetail extends GreenRenderDetail {
  expiresMs: number; // extracted from the CloudFront Expires param × 1000
}

type PersistedCache = Record<string, PersistedDetail>; // key = `${endpoint}:${holeId}`

function loadPersistedCache(): PersistedCache {
  try {
    const raw = localStorage.getItem(LS_GREEN_CACHE);
    return raw ? (JSON.parse(raw) as PersistedCache) : {};
  } catch {
    return {};
  }
}

function savePersistedCache(cache: PersistedCache) {
  try {
    localStorage.setItem(LS_GREEN_CACHE, JSON.stringify(cache));
  } catch { /* storage full — silently skip */ }
}

function extractExpiry(imageUrl: string): number {
  try {
    const expires = new URL(imageUrl).searchParams.get('Expires');
    if (expires) return parseInt(expires, 10) * 1000;
  } catch { /* */ }
  // Default: 1 year from now
  return Date.now() + 365 * 24 * 60 * 60 * 1000;
}

// In-memory layer on top of localStorage (avoids JSON parse on every call)
const memCache = new Map<string, GreenRenderDetail>();

// Pre-warm memory cache from localStorage on module load
const stored = loadPersistedCache();
const now = Date.now();
for (const [key, entry] of Object.entries(stored)) {
  if (entry.expiresMs > now) {
    memCache.set(key, { imageUrl: entry.imageUrl, meterToPixelScale: entry.meterToPixelScale, heading: entry.heading });
  }
}

async function fetchGreenDetail(
  endpoint: 'getSlopeImage' | 'getElevationImage',
  holeId: number,
): Promise<GreenRenderDetail> {
  const key = `${endpoint}:${holeId}`;

  // 1. Memory cache
  if (memCache.has(key)) return memCache.get(key)!;

  // 2. API call
  const headers = await authHeaders();
  const res = await fetch(
    `${BASE}/greens/${endpoint}?holeId=${holeId}`,
    { headers },
  );

  if (!res.ok) throw new Error(`GI ${endpoint} failed: ${res.status}`);

  const data: RawRenderDetailDto = await res.json();
  if (!data.imageUrl) throw new Error(`GI ${endpoint}: no image URL in response`);

  const detail: GreenRenderDetail = {
    imageUrl: data.imageUrl,
    meterToPixelScale: data.renderProperties?.meterToPixelScale ?? 0.025,
    heading: data.renderProperties?.heading ?? 0,
  };

  // 3. Persist to memory + localStorage
  memCache.set(key, detail);
  const persisted = loadPersistedCache();
  persisted[key] = { ...detail, expiresMs: extractExpiry(data.imageUrl) };
  // Evict expired entries while we're here
  for (const k of Object.keys(persisted)) {
    if (persisted[k].expiresMs <= now) delete persisted[k];
  }
  savePersistedCache(persisted);

  return detail;
}

interface RawRenderDetailDto {
  imageUrl?: string;
  renderProperties?: {
    meterToPixelScale?: number;
    heading?: number;
  };
}

export async function getSlopeDetail(holeId: number): Promise<GreenRenderDetail> {
  return fetchGreenDetail('getSlopeImage', holeId);
}

export async function getElevationDetail(holeId: number): Promise<GreenRenderDetail> {
  return fetchGreenDetail('getElevationImage', holeId);
}
