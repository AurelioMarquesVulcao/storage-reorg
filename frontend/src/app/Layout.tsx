import { NavLink, Outlet } from 'react-router-dom'
import { Copy, LayoutGrid, History, Activity } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Duplicatas', icon: Copy, end: true },
  { to: '/optimize', label: 'Otimização', icon: LayoutGrid, end: false },
  { to: '/actions', label: 'Histórico', icon: History, end: false },
  { to: '/progress', label: 'Progresso', icon: Activity, end: false },
]

const sidebarStyle: React.CSSProperties = {
  width: 240,
  minHeight: '100vh',
  background: '#0a0c12',
  borderRight: '1px solid #1e2130',
  display: 'flex',
  flexDirection: 'column',
  padding: '0',
  flexShrink: 0,
}

const logoStyle: React.CSSProperties = {
  padding: '24px 20px 20px',
  borderBottom: '1px solid #1e2130',
  marginBottom: 8,
}

const logoTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: '#e2e8f0',
  letterSpacing: '-0.3px',
}

const logoSubStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#4a5568',
  marginTop: 2,
}

const navStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '8px 10px',
}

function NavItem({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string
  label: string
  icon: React.ElementType
  end: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: isActive ? 600 : 400,
        color: isActive ? '#a5b4fc' : '#94a3b8',
        background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
        transition: 'background 0.15s, color 0.15s',
        textDecoration: 'none',
      })}
    >
      <Icon size={17} />
      {label}
    </NavLink>
  )
}

const mainStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  background: '#0f1117',
}

const contentStyle: React.CSSProperties = {
  flex: 1,
  padding: '32px 36px',
  overflowY: 'auto',
}

const footerStyle: React.CSSProperties = {
  padding: '12px 20px',
  borderTop: '1px solid #1e2130',
  fontSize: 11,
  color: '#2d3748',
  marginTop: 'auto',
}

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <div style={logoStyle}>
          <div style={logoTitleStyle}>💾 Storage Reorg</div>
          <div style={logoSubStyle}>Reorganização de HDs</div>
        </div>
        <nav style={navStyle}>
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <div style={footerStyle}>homeserver · porta 3040</div>
      </aside>

      {/* Main content */}
      <main style={mainStyle}>
        <div style={contentStyle}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
