// src/components/shared/AuthGuard.tsx
// Wraps all app routes — redirects to /login if no Supabase session.

import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import Login from '../../pages/Login'
import type { Session } from '@supabase/supabase-js'

interface Props {
  children: ReactNode
}

export default function AuthGuard({ children }: Props) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Loading — still resolving session
  if (session === undefined) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0A0C10' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
          <p className="text-xs font-body text-text-muted">Loading SkyFrame…</p>
        </div>
      </div>
    )
  }

  // Not authenticated — show login
  if (!session) {
    return <Login />
  }

  // Authenticated — render app
  return <>{children}</>
}
