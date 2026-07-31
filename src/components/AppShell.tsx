import { Outlet, NavLink } from 'react-router-dom';

const abas = [
  { para: '/', rotulo: 'Visão Geral', icone: '◈' },
  { para: '/lancamentos', rotulo: 'Lançamentos', icone: '⇄' },
  { para: '/contas', rotulo: 'Contas', icone: '▤' },
  { para: '/projecao', rotulo: 'Projeção', icone: '∿' },
  { para: '/mais', rotulo: 'Mais', icone: '•••' }
];

export default function AppShell() {
  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
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
