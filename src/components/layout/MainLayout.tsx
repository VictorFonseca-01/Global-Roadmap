import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { Outlet } from "react-router-dom"
import { ErrorBoundary } from "../ui/ErrorBoundary"


export function MainLayout() {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>

      </div>
    </div>
  )
}
