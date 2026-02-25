'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirect = searchParams.get('redirect') || '/'
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, redirect }),
      })

      if (res.status === 429) {
        setError('Too many attempts. Please try again later.')
        setLoading(false)
        return
      }

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Incorrect password')
        setLoading(false)
        return
      }

      router.push(data.redirect || '/')
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Access password"
          autoFocus
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !password}
        className="w-full py-2.5 px-4 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: '#1d4ed8' }}
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-8 text-center" style={{ backgroundColor: '#1e3a5f' }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-3"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <h1 className="text-xl font-semibold text-white">PropSearch AU</h1>
            <p className="text-sm text-blue-200 mt-1">Enter access password</p>
          </div>

          <Suspense fallback={<div className="p-6 text-center text-sm text-gray-400">Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
