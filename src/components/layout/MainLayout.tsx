import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { Outlet, useLocation } from "react-router-dom"
import { ErrorBoundary } from "../ui/ErrorBoundary"
import { useState, useEffect } from "react"

export function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      <Sidebar mobileMenuOpen={mobileMenuOpen} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
          <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
      
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  )
}
