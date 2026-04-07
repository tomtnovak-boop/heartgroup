import { supabase } from '@/integrations/supabase/client';

export async function clearClientSession() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Ignore sign-out errors and continue clearing local session state.
  }

  localStorage.clear();
  sessionStorage.clear();
}

export async function logoutAndRedirect() {
  await clearClientSession();
  window.location.href = '/';
}