interface BarraProgressoProps {
  percentual: number;
  cor: string;
}

export default function BarraProgresso({ percentual, cor }: BarraProgressoProps) {
  const p = Math.min(100, Math.max(0, percentual * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-raised">
      <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, background: cor }} />
    </div>
  );
}
