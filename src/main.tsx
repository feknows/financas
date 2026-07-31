import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/auth';

registerSW({ immediate: true });

supabase.auth.onAuthStateChange((_evento, sessao) => {
  useAuthStore.getState().definirUser(sessao?.user ?? null);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
