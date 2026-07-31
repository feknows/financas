import { Link } from 'react-router-dom';

const itens = [
  { para: '/mais/recorrentes', rotulo: 'Recorrentes' },
  { para: '/mais/metas', rotulo: 'Metas' },
  { para: '/mais/categorias', rotulo: 'Categorias' },
  { para: '/mais/limites', rotulo: 'Limites' },
  { para: '/mais/config', rotulo: 'Configurações' }
];

export default function Mais() {
  return (
    <div className="mx-auto max-w-lg p-5">
      <h1 className="font-display text-2xl font-bold">Mais</h1>
      <div className="mt-4 flex flex-col gap-2">
        {itens.map((i) => (
          <Link key={i.para} to={i.para} className="rounded-xl border border-line bg-surface p-4 font-medium">
            {i.rotulo} →
          </Link>
        ))}
      </div>
    </div>
  );
}
