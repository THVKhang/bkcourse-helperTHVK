// Supabase client is no longer used for Auth.
// Kept as a stub to avoid import errors in case any code still references it.

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: async () => {},
    signInAnonymously: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signInWithPassword: async () => ({ error: null }),
  },
};
