import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import TransactionForm from './TransactionForm'

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
                   'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

export default function Dashboard({ session, setCurrentPage }) {
  const [stats, setStats]           = useState({ income: 0, expenses: 0, balance: 0 })
  const [prevBalance, setPrevBalance] = useState(null)
  const [recentTxns, setRecentTxns] = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)

  const now          = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear  = now.getFullYear()

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)

    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
    const endDate   = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

    // Transactions du mois en cours
    const { data: txns } = await supabase
      .from('transactions')
      .select('*, categories(name, type, icon, color)')
      .eq('user_id', session.user.id)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false })

    if (txns) {
      const income   = txns.filter(t => t.categories?.type === 'income')
                           .reduce((s, t) => s + parseFloat(t.amount), 0)
      const expenses = txns.filter(t => t.categories?.type === 'expense')
                           .reduce((s, t) => s + parseFloat(t.amount), 0)
      setStats({ income, expenses, balance: income - expenses })
      setRecentTxns(txns.slice(0, 6))
    }

    // Mois précédent pour comparaison %
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const prevYear  = currentMonth === 1 ? currentYear - 1 : currentYear
    const prevStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
    const prevEnd   = new Date(prevYear, prevMonth, 0).toISOString().split('T')[0]

    const { data: prevTxns } = await supabase
      .from('transactions')
      .select('amount, categories(type)')
      .eq('user_id', session.user.id)
      .gte('transaction_date', prevStart)
      .lte('transaction_date', prevEnd)

    if (prevTxns && prevTxns.length > 0) {
      const pIn  = prevTxns.filter(t => t.categories?.type === 'income')
                            .reduce((s, t) => s + parseFloat(t.amount), 0)
      const pExp = prevTxns.filter(t => t.categories?.type === 'expense')
                            .reduce((s, t) => s + parseFloat(t.amount), 0)
      setPrevBalance(pIn - pExp)
    } else {
      setPrevBalance(null)
    }

    setLoading(false)
  }

  const prevMonthName = MONTHS_FR[
    currentMonth === 1 ? 11 : currentMonth - 2
  ]

  const changePercent = prevBalance !== null && prevBalance !== 0
    ? Math.round(((stats.balance - prevBalance) / Math.abs(prevBalance)) * 100)
    : null

  const monthName = new Date(currentYear, currentMonth - 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
        <div className="loading-spinner">
          <div className="spinner" />
          <span>Chargement…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">

      {/* En-tête desktop */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">{monthName}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}
          style={{ display: 'none' }}
          ref={el => el && window.innerWidth > 768 && (el.style.display = 'inline-flex')}>
          + Ajouter
        </button>
      </div>

      {/* ── Hero balance card ── */}
      <div className="balance-hero-card">
        <div className="balance-hero-label">Solde du mois</div>
        <div className="balance-hero-amount">{fmt(stats.balance)}</div>

        {changePercent !== null ? (
          <div className={`balance-change-chip ${changePercent >= 0 ? 'positive' : 'negative'}`}>
            {changePercent >= 0 ? '↑' : '↓'} {Math.abs(changePercent)}% vs {prevMonthName}
          </div>
        ) : (
          <div style={{ marginBottom: '22px' }} />
        )}

        <div className="kpi-chips-row">
          <div className="kpi-chip">
            <span className="kpi-chip-label">Revenus</span>
            <span className="kpi-chip-value income">{fmt(stats.income)}</span>
          </div>
          <div className="kpi-chip">
            <span className="kpi-chip-label">Dépenses</span>
            <span className="kpi-chip-value expense">-{fmt(stats.expenses)}</span>
          </div>
          <div className="kpi-chip">
            <span className="kpi-chip-label">Solde</span>
            <span className={`kpi-chip-value ${stats.balance >= 0 ? 'income' : 'expense'}`}>
              {fmt(stats.balance)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Transactions récentes ── */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Transactions récentes</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => setCurrentPage('transactions')}>
            Tout voir →
          </button>
        </div>

        {recentTxns.length > 0 ? (
          <div className="transaction-list">
            {recentTxns.map((t) => {
              const catColor = t.categories?.color || '#6366f1'
              const isIncome = t.categories?.type === 'income'
              return (
                <div key={t.id} className="transaction-item">
                  <div
                    className="transaction-category-icon"
                    style={{ background: `${catColor}22`, borderColor: `${catColor}33` }}
                  >
                    {t.categories?.icon || '📦'}
                  </div>
                  <div className="transaction-details">
                    <span className="transaction-desc">
                      {t.description || t.categories?.name || 'Transaction'}
                    </span>
                    <div className="transaction-meta">
                      <span className="transaction-date">
                        {new Date(t.transaction_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="transaction-cat-name" style={{ color: catColor }}>
                        {t.categories?.name || '—'}
                      </span>
                      {t.is_recurring && <span className="badge-recurring">🔁</span>}
                      {t.user_id !== session.user.id && (
                        <span className="badge-partner">👥 Partenaire</span>
                      )}
                    </div>
                  </div>
                  <span className={`transaction-amount ${t.categories?.type || 'expense'}`}>
                    {isIncome ? '+' : '−'}{fmt(t.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '32px 0' }}>
            <div style={{ fontSize: '36px' }}>📝</div>
            <h3 style={{ marginTop: '10px' }}>Aucune transaction ce mois</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Commencez par enregistrer vos revenus et dépenses.
            </p>
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setShowForm(true)}>
              + Ajouter une transaction
            </button>
          </div>
        )}
      </div>

      {/* Bouton flottant mobile */}
      <button className="btn-add-mobile" onClick={() => setShowForm(true)} aria-label="Ajouter une transaction">
        +
      </button>

      {showForm && (
        <TransactionForm
          userId={session.user.id}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchData() }}
        />
      )}
    </div>
  )
}
