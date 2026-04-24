import { supabase } from '../lib/supabase'

const NAV_ITEMS = [
  { id: 'dashboard', icon: '📊', label: 'Tableau de bord', short: 'Tableau' },
  { id: 'transactions', icon: '💳', label: 'Transactions', short: 'Transactions' },
  { id: 'budget', icon: '🎯', label: 'Objectifs budget', short: 'Objectifs' },
]

export default function Layout({ children, currentPage, setCurrentPage, session }) {
  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const userInitial = session?.user?.email?.[0]?.toUpperCase() || '?'

  return (
    <div className="app-layout">
      {/* Sidebar — desktop */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">💰</span>
          <h2>BudgetApp</h2>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{userInitial}</div>
            <span className="user-email">{session?.user?.email}</span>
          </div>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', fontSize: '13px' }}
            onClick={handleSignOut}
          >
            🚪 Déconnexion
          </button>
        </div>
      </aside>

      {/* Page content */}
      <main className="main-content">{children}</main>

      {/* Bottom nav — mobile */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`bottom-nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => setCurrentPage(item.id)}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            {item.short.split(' ')[0]}
          </button>
        ))}
      </nav>
    </div>
  )
}
