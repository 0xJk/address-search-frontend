const COOKIE_NAME = 'access_token'
const MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

function getSecret(): string {
  const secret = process.env.COOKIE_SECRET
  if (!secret) throw new Error('COOKIE_SECRET is not set')
  return secret
}

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function base64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (str.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/** Create a signed token with expiration */
export async function createToken(): Promise<string> {
  const secret = getSecret()
  const key = await getKey(secret)
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE
  const payload = JSON.stringify({ exp })
  const payloadB64 = base64urlEncode(new TextEncoder().encode(payload))
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64))
  const sigB64 = base64urlEncode(sig)
  return `${payloadB64}.${sigB64}`
}

/** Verify token signature and expiration. Returns true if valid. */
export async function verifyToken(token: string): Promise<boolean> {
  try {
    const secret = getSecret()
    const key = await getKey(secret)
    const [payloadB64, sigB64] = token.split('.')
    if (!payloadB64 || !sigB64) return false

    const expectedSig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64))
    const expectedB64 = base64urlEncode(expectedSig)

    // Compare signatures using HMAC to prevent timing attacks
    const match = await safeCompare(sigB64, expectedB64, key)
    if (!match) return false

    const payloadBytes = base64urlDecode(payloadB64)
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes))
    if (typeof payload.exp !== 'number') return false
    if (Math.floor(Date.now() / 1000) > payload.exp) return false

    return true
  } catch {
    return false
  }
}

/** Timing-safe string comparison using HMAC */
async function safeCompare(a: string, b: string, key: CryptoKey): Promise<boolean> {
  const enc = new TextEncoder()
  const [hmacA, hmacB] = await Promise.all([
    crypto.subtle.sign('HMAC', key, enc.encode(a)),
    crypto.subtle.sign('HMAC', key, enc.encode(b)),
  ])
  const viewA = new Uint8Array(hmacA)
  const viewB = new Uint8Array(hmacB)
  return viewA.length === viewB.length && viewA.every((byte, i) => byte === viewB[i])
}

/** Compare password using HMAC-based safe comparison */
export async function verifyPassword(input: string): Promise<boolean> {
  const expected = process.env.ACCESS_PASSWORD
  if (!expected) return false
  const secret = getSecret()
  const key = await getKey(secret)
  return safeCompare(input, expected, key)
}

export { COOKIE_NAME, MAX_AGE }
