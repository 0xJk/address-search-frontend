import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import { apiRatelimit, loginRatelimit, checkRateLimit } from '@/lib/ratelimit'

const PUBLIC_PATHS = ['/login', '/rate-limited']

function getIp(request: NextRequest): string | null {
  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    null
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Public paths — always allow
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 2. Login endpoint — check login rate limit, then pass through
  if (pathname === '/api/auth/login') {
    const ip = getIp(request)
    if (ip) {
      const result = await checkRateLimit(loginRatelimit, `login:${ip}`)
      if (result.limited) {
        return NextResponse.redirect(new URL('/rate-limited', request.url))
      }
    }
    return NextResponse.next()
  }

  // 3. Auth check — verify cookie
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token || !(await verifyToken(token))) {
    const loginUrl = new URL('/login', request.url)
    // Only set redirect for non-API paths (API calls get 401 instead of redirect)
    if (!pathname.startsWith('/api/')) {
      const redirect = pathname + request.nextUrl.search
      const isRelative = redirect.startsWith('/') && !redirect.startsWith('//')
      if (isRelative) {
        loginUrl.searchParams.set('redirect', redirect)
      }
    }

    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.redirect(loginUrl)
  }

  // 4. API rate limiting (only for /api/* paths)
  if (pathname.startsWith('/api/')) {
    const ip = getIp(request)
    if (ip) {
      const result = await checkRateLimit(apiRatelimit, `api:${ip}`)
      if (result.limited) {
        return NextResponse.redirect(new URL('/rate-limited', request.url))
      }
      // Attach rate limit headers
      const response = NextResponse.next()
      if (result.remaining !== undefined) {
        response.headers.set('X-RateLimit-Remaining', String(result.remaining))
      }
      if (result.reset !== undefined) {
        response.headers.set('X-RateLimit-Reset', String(result.reset))
      }
      return response
    }
  }

  // 5. Authenticated page request — allow
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static assets and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
