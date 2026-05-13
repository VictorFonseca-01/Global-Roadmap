import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"
import { MainLayout } from "@/components/layout/MainLayout"
import Dashboard from "@/pages/Dashboard"
import PlaceholderPage from "@/pages/PlaceholderPage"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

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
              <Route path="categories" element={<PlaceholderPage title="Categorias" />} />
              <Route path="lifecycle" element={<PlaceholderPage title="Lifecycle Catalog" />} />
              <Route path="assets" element={<PlaceholderPage title="Assets" />} />
              <Route path="applications" element={<PlaceholderPage title="Applications" />} />
              <Route path="migration-plans" element={<PlaceholderPage title="Migration Plans" />} />
              <Route path="reports" element={<PlaceholderPage title="Relatórios" />} />
              <Route path="settings" element={<PlaceholderPage title="Configurações" />} />
            </Route>
          </Routes>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
