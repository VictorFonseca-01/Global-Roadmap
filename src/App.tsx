import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"
import { MainLayout } from "@/components/layout/MainLayout"
import Dashboard from "@/pages/Dashboard"
import Categories from "@/pages/Categories"
import Lifecycle from "@/pages/Lifecycle"
import Assets from "@/pages/Assets"
import Applications from "@/pages/Applications"
import MigrationPlans from "@/pages/MigrationPlans"
import PlaceholderPage from "@/pages/PlaceholderPage"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="global-parts-theme">
        <Router>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="roadmaps" element={<PlaceholderPage title="Roadmaps" />} />
              <Route path="categories" element={<Categories />} />
              <Route path="lifecycle" element={<Lifecycle />} />
              <Route path="assets" element={<Assets />} />
              <Route path="applications" element={<Applications />} />
              <Route path="migration-plans" element={<MigrationPlans />} />
              <Route path="reports" element={<PlaceholderPage title="Relatórios" />} />
              <Route path="settings" element={<PlaceholderPage title="Configurações" />} />
            </Route>
          </Routes>
        </Router>
        <Toaster position="top-right" richColors />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
