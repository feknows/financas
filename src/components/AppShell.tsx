import { useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useDataStore } from '../store/data';

const abas = [
  { para: '/', rotulo: 'Visão Geral', icone: '◈' },
  { para: '/lancamentos', rotulo: 'Lançamentos', icone: '⇄' },
  { para: '/contas', rotulo: 'Contas', icone: '▤' },
  { para: '/projecao', rotulo: 'Projeção', icone: '∿' },
  { para: '/mais', rotulo: 'Mais', icone: '•••' }
];

export default function AppShell() {
  const carregar = useDataStore((s) => s.carregar);
  const processarRecorrentes = useDataStore((s) => s.processarRecorrentes);
  const carregando = useDataStore((s) => s.carregando);
  const erro = useDataStore((s) => s.erro);

  useEffect(() => {
    let ativo = true;
    (async () => {
      await carregar();
      if (!ativo) return;
      await processarRecorrentes();
    })();
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto pb-20">
        {carregando && (
          <p className="p-5 text-center text-sm text-ink-muted">Carregando...</p>
        )}
        {!carregando && erro && (
          <div className="p-5 text-center">
            <p className="mb-3 text-sm text-danger">{erro}</p>
            <button onClick={() => carregar()} className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold">
              Tentar novamente
            </button>
          </div>
        )}
        {!carregando && !erro && <Outlet />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {abas.map((a) => (
            <NavLink
              key={a.para}
              to={a.para}
              end={a.para === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${
                  isActive ? 'text-primary' : 'text-ink-muted'
                }`
              }
            >
              <span className="text-base leading-none">{a.icone}</span>
              {a.rotulo}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
