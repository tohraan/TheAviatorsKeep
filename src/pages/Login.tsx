import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Auth state change triggers AuthGuard re-render automatically
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#0A0C10' }}
    >
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#1E2230 1px, transparent 1px), linear-gradient(90deg, #1E2230 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.4,
        }}
      />

      {/* Glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-64 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #3B7FE830 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative w-full max-w-sm space-y-8">

        {/* Logo / Brand */}
        <div className="text-center space-y-2">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-2"
            style={{
              background: 'linear-gradient(135deg, #1E3A6E 0%, #3B7FE8 100%)',
              boxShadow: '0 0 32px #3B7FE840',
            }}
          >
            <span className="text-3xl">✈️</span>
          </div>
          <h1
            className="text-3xl font-headline tracking-widest"
            style={{ color: '#F1F3F7' }}
          >
            SKYFRAME
          </h1>
          <p className="text-xs font-body" style={{ color: '#4A5068' }}>
            CRM — Internal Operations
          </p>
        </div>

        {/* Login card */}
        <div
          className="rounded-2xl p-8 space-y-5"
          style={{
            background: '#111318',
            border: '1px solid #2A2F3E',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          }}
        >
          <div>
            <h2 className="text-base font-ui font-semibold text-text-primary">
              Sign in
            </h2>
            <p className="text-xs font-body text-text-secondary mt-0.5">
              Authorised personnel only.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-ui tracking-widest uppercase text-text-secondary">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full rounded-lg px-4 py-2.5 text-sm font-body text-text-primary focus:outline-none transition-colors"
                style={{
                  background: '#15181F',
                  border: '1px solid #2A2F3E',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#3B7FE8')}
                onBlur={e => (e.currentTarget.style.borderColor = '#2A2F3E')}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-ui tracking-widest uppercase text-text-secondary">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg px-4 py-2.5 text-sm font-body text-text-primary focus:outline-none transition-colors pr-10"
                  style={{
                    background: '#15181F',
                    border: '1px solid #2A2F3E',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#3B7FE8')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#2A2F3E')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                  style={{ fontSize: '14px' }}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="rounded-lg px-4 py-2.5 text-xs font-body"
                style={{ background: '#EF444415', border: '1px solid #EF444440', color: '#EF4444' }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-ui font-medium transition-all duration-200"
              style={{
                background: loading ? '#1E3A6E' : '#3B7FE8',
                color: '#F1F3F7',
                opacity: loading ? 0.7 : 1,
                boxShadow: loading ? 'none' : '0 0 20px #3B7FE840',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs font-body" style={{ color: '#2A2F3E' }}>
          Dubai, UAE · SkyFrame Aviation Frames
        </p>
      </div>
    </div>
  )
}
