import { NextRequest, NextResponse } from 'next/server'
import { createToken, verifyPassword, COOKIE_NAME, MAX_AGE } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, redirect } = body as { password?: string; redirect?: string }

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    const valid = await verifyPassword(password)
    if (!valid) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    const token = await createToken()

    // Validate redirect is a relative path
    const isRelative = typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    const target = isRelative ? redirect : '/'

    const response = NextResponse.json({ success: true, redirect: target })
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: MAX_AGE,
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
