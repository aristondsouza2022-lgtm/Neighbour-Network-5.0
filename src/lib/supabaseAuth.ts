import { requireSupabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

export async function registerWithEmail(email: string, password: string, metadata: Record<string, unknown> = {}) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: metadata },
  });
  if (error) throw error;
  // Supabase may require email confirmation, in which case there is deliberately no session.
  if (!data.session) {
    return { session: null, user: data.user, needsEmailConfirmation: true as const };
  }
  return { session: data.session, user: data.user, needsEmailConfirmation: false as const };
}

export async function loginWithEmail(email: string, password: string): Promise<{ session: Session; user: User }> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  if (!data.session || !data.user) throw new Error('Login did not create an authenticated session.');
  return { session: data.session, user: data.user };
}

export async function getVerifiedSession(): Promise<Session | null> {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}
