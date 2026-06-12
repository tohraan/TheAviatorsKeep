import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Home,
  Users,
  Package,
  Coins,
  Calendar,
  Cpu,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface SidebarItem {
  name: string
  path: string
  icon: React.ComponentType<any>
}

export default function Layout() {
  const [isExpanded, setIsExpanded] = useState(true)
  const location = useLocation()

  const navItems: SidebarItem[] = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Leads', path: '/leads', icon: Users },
    { name: 'Orders', path: '/orders', icon: Package },
    { name: 'Finance', path: '/finance', icon: Coins },
    { name: 'Content', path: '/content', icon: Calendar },
    { name: 'Agency', path: '/content/agency', icon: Cpu },
    { name: 'Settings', path: '/settings', icon: Settings },
  ]

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-base text-text-primary">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative flex flex-col border-r border-border-default bg-bg-surface transition-all duration-200 ease-out z-10",
          isExpanded ? "w-[220px]" : "w-[64px]"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border-subtle">
          {isExpanded ? (
            <span className="font-headline text-lg tracking-widest text-text-primary">
              SKY<span className="text-accent-primary">FRAME</span>
            </span>
          ) : (
            <span className="font-headline text-lg text-accent-primary mx-auto">S</span>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden md:flex h-6 w-6 items-center justify-center rounded-md border border-border-default hover:bg-bg-elevated transition-colors text-text-secondary hover:text-text-primary"
          >
            {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Sidebar Items */}
        <nav className="flex-1 space-y-1 py-4 px-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)

            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive: linkActive }) =>
                  cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-ui transition-colors relative group",
                    (isActive || linkActive)
                      ? "bg-accent-muted text-text-primary border-l-2 border-accent-primary pl-[10px]"
                      : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                  )
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {isExpanded ? (
                  <span className="ml-3 transition-opacity duration-200">{item.name}</span>
                ) : (
                  <span className="absolute left-14 hidden group-hover:block bg-bg-elevated border border-border-default text-xs rounded-md px-2 py-1 whitespace-nowrap z-20">
                    {item.name}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center border-b border-border-default bg-bg-surface px-4 md:hidden">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-text-secondary hover:text-text-primary"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="ml-4 font-headline text-lg tracking-widest">
            SKY<span className="text-accent-primary">FRAME</span>
          </span>
        </header>

        {/* Page Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-[1400px] w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
