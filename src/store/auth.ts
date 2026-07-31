import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  inicializando: boolean;
  definirUser: (user: User | null) => void;
  signIn: (email: string, senha: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  inicializando: true,
  definirUser: (user) => set({ user }),
  signIn: async (email, senha) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    return error ? 'Email ou senha inválidos.' : null;
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  }
}));
