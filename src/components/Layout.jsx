import { useState } from 'react'
import { supabase } from '../lib/supabase'

const NAV_ITEMS = [
  { id: 'dashboard', icon: '📊', label: 'Tableau de bord', short: 'Tableau' },
  { id: 'transactions', icon: '💳', label: 'Transactions', short: 'Transac.' },
  { id: 'budget', icon: '🎯', label: 'Objectifs budget', short: 'Objectifs' },
]

export default function Layout({ children, currentPage, setCurrentPage, session }) {
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const userInitial = session?.user?.email?.[0]?.toUpperCase() || '?'

  return (
    <div className="app-layout">
      {/* Sidebar — desktop uniquement */}
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

      {/* En-tête — mobile uniquement */}
      <header className="mobile-header">
        <div className="mobile-header-logo">
          <span style={{ fontSize: '22px' }}>💰</span>
          <span className="mobile-header-title">BudgetApp</span>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            className="mobile-user-btn"
            onClick={() => setShowUserMenu((v) => !v)}
            aria-label="Menu utilisateur"
          >
            {userInitial}
          </button>
          {showUserMenu && (
            <>
              <div
                className="mobile-user-overlay"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="mobile-user-menu">
                <div className="mobile-user-email">{session?.user?.email}</div>
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', fontSize: '13px', marginTop: '8px' }}
                  onClick={handleSignOut}
                >
                  🚪 Déconnexion
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Contenu principal */}
      <main className="main-content">{children}</main>

      {/* Navigation bas — mobile uniquement */}
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
