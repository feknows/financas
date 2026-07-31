import { useState } from 'react';
import { useAuthStore } from '../store/auth';

export default function Login() {
  const signIn = useAuthStore((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const entrar = async () => {
    if (!email || !senha) return;
    setEnviando(true);
    const err = await signIn(email.trim(), senha);
    setErro(err ?? '');
    setEnviando(false);
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6">
      <h1 className="font-display text-4xl font-bold text-primary">Finanças</h1>
      <p className="mb-8 mt-1 text-sm text-ink-muted">Seu dinheiro, com previsibilidade.</p>
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
          className="mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary"
        />
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') entrar(); }}
          placeholder="••••••••"
          className="mb-5 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary"
        />
        {erro && <p className="mb-3 text-sm text-danger">{erro}</p>}
        <button
          onClick={entrar}
          disabled={enviando}
          className="w-full rounded-xl bg-primary py-3 font-semibold text-white disabled:opacity-50"
        >
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </div>
  );
}
