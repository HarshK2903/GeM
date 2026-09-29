import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { LayoutDashboard, FileText, ShieldCheck, Sparkles, BarChart3, ScrollText, Shield, LogOut, ChevronRight, MessageSquare, Sun, Moon } from 'lucide-react'
import { ToastContainer } from '@/components/ui/toast'
import { useThemeStore } from '@/stores/themeStore'

const navItems = [
  { to: '/officer', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/officer/tenders', icon: FileText, label: 'Tenders' },
  { to: '/officer/compliance', icon: ShieldCheck, label: 'Compliance' },
  { to: '/officer/support', icon: MessageSquare, label: 'Support' },
  { to: '/officer/copilot', icon: Sparkles, label: 'Copilot' },
  { to: '/officer/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/officer/audit', icon: ScrollText, label: 'Audit trail' },
]

export default function OfficerLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useThemeStore()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-background">
      <ToastContainer />
      {/* Sidebar */}
      <aside className="w-[240px] flex flex-col border-r border-border bg-sidebar flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded-md bg-[var(--gem-blue)] flex items-center justify-center">
            <Shield size={14} className="text-white" />
          </div>
          <div>
            <span className="text-sm font-semibold tracking-tight">GemVerify</span>
            <p className="text-[10px] text-muted-foreground leading-none">Officer Portal</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-150
                ${isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`
              }>
              <item.icon size={16} className="flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <Separator />

        {/* User section */}
        <div className="px-3 py-3">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-secondary-foreground flex-shrink-0">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'O'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name || 'Officer'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start mt-1 text-muted-foreground hover:text-foreground" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={14} className="mr-2" /> : <Moon size={14} className="mr-2" />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start mt-1 text-muted-foreground hover:text-foreground" onClick={handleLogout}>
            <LogOut size={14} className="mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {location.pathname.includes('/support') ? (
          <Outlet />
        ) : (
          <div className="max-w-6xl mx-auto px-6 py-6">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  )
}
