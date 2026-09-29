import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { LayoutDashboard, FileText, Shield, LogOut, FileCheck, MessageSquare, Sun, Moon } from 'lucide-react'
import { ToastContainer } from '@/components/ui/toast'
import { useThemeStore } from '@/stores/themeStore'

const navItems = [
  { to: '/bidder', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/bidder/bids', icon: FileCheck, label: 'My bids' },
  { to: '/bidder/tenders', icon: FileText, label: 'Browse tenders' },
  { to: '/bidder/support', icon: MessageSquare, label: 'Support' },
]

export default function BidderLayout() {
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
      <aside className="w-[240px] flex flex-col border-r border-border bg-sidebar flex-shrink-0">
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded-md bg-[var(--gem-blue)] flex items-center justify-center">
            <Shield size={14} className="text-white" />
          </div>
          <div>
            <span className="text-sm font-semibold tracking-tight">GemVerify</span>
            <p className="text-[10px] text-muted-foreground leading-none">Bidder Portal</p>
          </div>
        </div>

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

        <div className="px-3 py-3">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-secondary-foreground flex-shrink-0">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'B'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name || 'Bidder'}</p>
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
