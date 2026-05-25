import { Suspense, lazy } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"
import { MainLayout } from "@/components/layout/MainLayout"
import { Loader2 } from "lucide-react"

const Dashboard = lazy(() => import("@/pages/Dashboard"))
const RoadmapsLegacy = lazy(() => import("@/pages/Roadmaps"))
const RoadmapTimelineLegacy = lazy(() => import("@/pages/RoadmapTimeline"))
const StrategicTimelineWorkspace = lazy(() => import("@/pages/StrategicTimelineWorkspace"))
const SettingsAI = lazy(() => import("@/pages/SettingsAI"))
const Categories = lazy(() => import("@/pages/Categories"))
const Lifecycle = lazy(() => import("@/pages/Lifecycle"))
const Assets = lazy(() => import("@/pages/Assets"))
const Applications = lazy(() => import("@/pages/Applications"))
const MigrationPlans = lazy(() => import("@/pages/MigrationPlans"))
const Notifications = lazy(() => import("@/pages/Notifications"))
const Profile = lazy(() => import("@/pages/Profile"))
const Settings = lazy(() => import("@/pages/Settings"))
const Login = lazy(() => import("@/pages/Login"))

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import { AuthProvider } from "@/components/auth/AuthProvider"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { TooltipProvider } from "@/components/ui/tooltip"

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

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
                <Suspense fallback={<LoadingScreen />}>
                  <Routes>
                    {/* Rota Pública */}
                    <Route path="/login" element={<Login />} />

                    {/* Rotas Protegidas */}
                    <Route path="/" element={
                      <AuthGuard>
                        <MainLayout />
                      </AuthGuard>
                    }>
                      {/* ── Rotas Principais (visíveis na Sidebar) ── */}
                      <Route index element={<Dashboard />} />
                      <Route path="assets" element={<Assets />} />
                      <Route path="roadmaps" element={<StrategicTimelineWorkspace />} />
                      <Route path="settings" element={<Settings />} />
                      <Route path="profile" element={<Profile />} />

                      {/* ── Rotas Internas (ocultas da sidebar, mantidas para compatibilidade) ── */}
                      <Route path="legacy-roadmaps" element={<RoadmapsLegacy />} />
                      <Route path="legacy-roadmap-timeline" element={<RoadmapTimelineLegacy />} />
                      <Route path="categories" element={<Categories />} />
                      <Route path="lifecycle" element={<Lifecycle />} />
                      <Route path="applications" element={<Applications />} />
                      <Route path="migration-plans" element={<MigrationPlans />} />
                      <Route path="roadmap-timeline" element={<Navigate to="/roadmaps" replace />} />
                      <Route path="notifications" element={<Notifications />} />
                      <Route path="settings/ai" element={<SettingsAI />} />
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
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
