import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"
import { MainLayout } from "@/components/layout/MainLayout"
import Dashboard from "@/pages/Dashboard"
import Roadmaps from "@/pages/Roadmaps"
import RoadmapTimeline from "@/pages/RoadmapTimeline"
import SettingsAI from "@/pages/SettingsAI"
import Categories from "@/pages/Categories"
import Lifecycle from "@/pages/Lifecycle"
import Assets from "@/pages/Assets"
import Applications from "@/pages/Applications"
import MigrationPlans from "@/pages/MigrationPlans"
import Notifications from "@/pages/Notifications"
import Profile from "@/pages/Profile"
import Settings from "@/pages/Settings"
import Login from "@/pages/Login"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import { AuthProvider } from "@/components/auth/AuthProvider"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { TooltipProvider } from "@/components/ui/tooltip"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider defaultTheme="system" storageKey="global-parts-theme">
            <Router>
              <TooltipProvider>
                <Routes>
                  {/* Rota Pública */}
                  <Route path="/login" element={<Login />} />

                  {/* Rotas Protegidas */}
                  <Route path="/" element={
                    <AuthGuard>
                      <MainLayout />
                    </AuthGuard>
                  }>
                    <Route index element={<Dashboard />} />
                    <Route path="roadmaps" element={<Roadmaps />} />
                    <Route path="categories" element={<Categories />} />
                    <Route path="lifecycle" element={<Lifecycle />} />
                    <Route path="assets" element={<Assets />} />
                    <Route path="applications" element={<Applications />} />
                    <Route path="migration-plans" element={<MigrationPlans />} />
                    <Route path="roadmap-timeline" element={<RoadmapTimeline />} />
                    <Route path="notifications" element={<Notifications />} />
                    <Route path="settings/ai" element={<SettingsAI />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </TooltipProvider>
            </Router>
            <Toaster position="top-right" richColors />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
