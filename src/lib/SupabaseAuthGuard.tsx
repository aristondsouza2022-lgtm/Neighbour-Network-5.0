import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVerifiedSession } from './supabaseAuth';

type SupabaseAuthGuardProps = { children: React.ReactNode };

/**
 * Wrap private route elements with this guard.
 * The route stays in a loading state until Supabase has checked the persisted session.
 */
export function SupabaseAuthGuard({ children }: SupabaseAuthGuardProps) {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getVerifiedSession()
      .then((session) => {
        if (!active) return;
        if (!session) {
          navigate('/login', { replace: true });
          return;
        }
        setAllowed(true);
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
        navigate('/login', { replace: true });
      });
    return () => { active = false; };
  }, [navigate]);

  if (!allowed) {
    return <div role="status" className="min-h-screen grid place-items-center p-6 text-sm text-slate-600">
      {failed ? 'Unable to verify your session. Redirecting to login…' : 'Checking your session…'}
    </div>;
  }
  return <>{children}</>;
}
