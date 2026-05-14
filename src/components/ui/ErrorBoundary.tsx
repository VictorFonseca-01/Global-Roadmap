import { Component, type ErrorInfo, type ReactNode } from "react";
import { ShieldAlert, RefreshCw, Home } from "lucide-react";
import { Button } from "./button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/10">
            <ShieldAlert className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="mb-2 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Ops! Algo deu errado.
          </h2>
          <p className="mb-8 max-w-md text-slate-500 dark:text-slate-400">
            Ocorreu um erro inesperado ao carregar esta página. Nossa equipe técnica já foi notificada.
          </p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="rounded-full px-6"
              onClick={() => window.location.href = '/'}
            >
              <Home className="mr-2 h-4 w-4" />
              Voltar ao Início
            </Button>
            <Button 
              className="rounded-full px-6 shadow-lg shadow-primary/20"
              onClick={() => this.setState({ hasError: false })}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar Novamente
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-8 max-w-full overflow-auto rounded-xl bg-slate-100 p-4 text-left text-xs text-red-600 dark:bg-slate-900">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

