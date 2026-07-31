import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/auth';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import VisaoGeral from './pages/VisaoGeral';
import Lancamentos from './pages/Lancamentos';
import Contas from './pages/Contas';
import Projecao from './pages/Projecao';
import Mais from './pages/Mais';
import Recorrentes from './pages/Recorrentes';
import Metas from './pages/Metas';
import Categorias from './pages/Categorias';
import Limites from './pages/Limites';
import Config from './pages/Config';

export default function App() {
  const user = useAuthStore((s) => s.user);
  const inicializando = useAuthStore((s) => s.inicializando);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => useAuthStore.getState().definirUser(data.session?.user ?? null))
      .finally(() => useAuthStore.setState({ inicializando: false }));
  }, []);

  if (inicializando) {
    return <div className="flex h-full items-center justify-center text-ink-muted">Carregando...</div>;
  }

  if (!user) return <Login />;

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<VisaoGeral />} />
          <Route path="/lancamentos" element={<Lancamentos />} />
          <Route path="/contas" element={<Contas />} />
          <Route path="/projecao" element={<Projecao />} />
          <Route path="/mais" element={<Mais />} />
          <Route path="/mais/recorrentes" element={<Recorrentes />} />
          <Route path="/mais/metas" element={<Metas />} />
          <Route path="/mais/categorias" element={<Categorias />} />
          <Route path="/mais/limites" element={<Limites />} />
          <Route path="/mais/config" element={<Config />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
