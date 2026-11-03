export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Acesso Restrito</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Entre com suas credenciais corporativas</p>
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              placeholder="seu.email@globalparts.com"
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Senha
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-4"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
