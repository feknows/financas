import { useEffect } from 'react';
import { useToastStore } from '../store/toast';

export default function Toast() {
  const visivel = useToastStore((s) => s.visivel);
  const mensagem = useToastStore((s) => s.mensagem);
  const onDesfazer = useToastStore((s) => s.onDesfazer);
  const esconder = useToastStore((s) => s.esconder);

  useEffect(() => {
    if (!visivel) return;
    const timer = setTimeout(() => esconder(), 6000);
    return () => clearTimeout(timer);
  }, [visivel, mensagem, esconder]);

  if (!visivel) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(5rem_+_env(safe-area-inset-bottom))] left-1/2 z-40 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-xl border border-line bg-surface p-4 shadow-lg"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{mensagem}</p>
        {onDesfazer && (
          <button
            onClick={() => { onDesfazer(); esconder(); }}
            className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white"
          >
            Desfazer
          </button>
        )}
      </div>
    </div>
  );
}
