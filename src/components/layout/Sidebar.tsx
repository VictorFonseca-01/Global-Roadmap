import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  LayoutDashboard, 
  Map, 
  Tag, 
  BookOpen, 
  Monitor, 
  AppWindow, 
  ArrowRightCircle, 
  FileText, 
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from "lucide-react"
import { useState } from "react"
import { Link, useLocation } from "react-router-dom"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/" },
    { name: "Roadmaps", icon: Map, path: "/roadmaps" },
    { name: "Categorias", icon: Tag, path: "/categories" },
    { name: "Lifecycle Catalog", icon: BookOpen, path: "/lifecycle" },
    { name: "Assets", icon: Monitor, path: "/assets" },
    { name: "Applications", icon: AppWindow, path: "/applications" },
    { name: "Migration Plans", icon: ArrowRightCircle, path: "/migration-plans" },
    { name: "Reports", icon: FileText, path: "/reports" },
    { name: "Settings", icon: Settings, path: "/settings" },
  ]

  return (
    <div className={cn(
      "relative flex flex-col border-r bg-card transition-all duration-300 ease-in-out",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      <div className="flex h-16 items-center px-4 border-b">
        <Link to="/" className="flex items-center gap-2 overflow-hidden">
          <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
          {!collapsed && <span className="font-bold text-lg truncate">Global Parts</span>}
        </Link>
      </div>

      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <Button
                variant={location.pathname === item.path ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 px-3",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.name : ""}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Button>
            </Link>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <Button 
          variant="ghost" 
          size="icon" 
          className="w-full" 
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  )
}
