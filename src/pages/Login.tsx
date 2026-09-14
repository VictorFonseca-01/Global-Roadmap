export default function Login() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
      <div className="p-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100 mb-6">
          Acesso Restrito
        </h1>
        <form>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="seu.email@globalparts.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
