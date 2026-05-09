import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCurrency, CURRENCIES } from '../lib/CurrencyContext'

const NAV_ITEMS = [
  { id: 'dashboard',   icon: '📊', label: 'Tableau de bord',   short: 'Tableau'  },
  { id: 'transactions',icon: '💳', label: 'Transactions',       short: 'Transac.' },
  { id: 'recurring',   icon: '🔁', label: 'Récurrences',        short: 'Récurr.'  },
  { id: 'reports',     icon: '📈', label: 'Rapports',            short: 'Rapports' },
  { id: 'budget',      icon: '🎯', label: 'Objectifs budget',   short: 'Objectifs'},
  { id: 'wishlist',    icon: '🛍️', label: 'Liste de souhaits',  short: 'Souhaits' },
]

// Uniquement dans la sidebar (pas dans la bottom nav mobile)
const SIDEBAR_EXTRA = [
  { id: 'household', icon: '👫', label: 'Compte partagé' },
]

export default function Layout({ children, currentPage, setCurrentPage, session }) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const { currency, setCurrency } = useCurrency()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const userInitial = session?.user?.email?.[0]?.toUpperCase() || '?'

  return (
    <div className="app-layout">
      {/* Sidebar — desktop uniquement */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">💰</div>
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
          <div className="sidebar-nav-divider" />
          {SIDEBAR_EXTRA.map((item) => (
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
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{
              width: '100%',
              marginBottom: '8px',
              padding: '6px 8px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
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
          <div className="mobile-header-logo-icon">💰</div>
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
                <div style={{ marginTop: '10px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    💱 Devise
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => { setCurrency(e.target.value); setShowUserMenu(false) }}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '13px',
                    }}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', fontSize: '13px', marginTop: '8px', justifyContent: 'flex-start' }}
                  onClick={() => { setCurrentPage('household'); setShowUserMenu(false) }}
                >
                  👫 Compte partagé
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', fontSize: '13px', marginTop: '4px' }}
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
