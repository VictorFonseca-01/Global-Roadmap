export default function Login() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-slate-800">
        <h1 className="mb-6 text-2xl font-bold text-slate-800 dark:text-slate-100">
          Acesso Restrito
        </h1>
        <form>
          <div className="mb-4">
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-semibold text-slate-600 dark:text-slate-400"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="seu.email@globalparts.com"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
