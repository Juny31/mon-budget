import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import TransactionForm from './TransactionForm'
import { useFmt } from '../lib/CurrencyContext'

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
                   'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

export default function Dashboard({ session, setCurrentPage }) {
  const fmt = useFmt()
  const [stats, setStats]           = useState({ income: 0, expenses: 0, balance: 0 })
  const [prevBalance, setPrevBalance] = useState(null)
  const [allTxns, setAllTxns]       = useState([])
  const [recentTxns, setRecentTxns] = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [vue, setVue]               = useState('mine') // 'mine' | 'foyer'

  const now          = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear  = now.getFullYear()

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)

    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
    const endDate   = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

    // Transactions du mois en cours (RLS gère le filtrage foyer)
    const { data: txns } = await supabase
      .from('transactions')
      .select('*, categories(name, type, icon, color)')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false })

    if (txns) {
      setAllTxns(txns)
      const mine = txns.filter(t => t.user_id === session.user.id)
      const income   = mine.filter(t => t.categories?.type === 'income')
                           .reduce((s, t) => s + parseFloat(t.amount), 0)
      const expenses = mine.filter(t => t.categories?.type === 'expense')
                           .reduce((s, t) => s + parseFloat(t.amount), 0)
      setStats({ income, expenses, balance: income - expenses })
      setRecentTxns(mine.slice(0, 6))
    }

    // Mois précédent pour comparaison %
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const prevYear  = currentMonth === 1 ? currentYear - 1 : currentYear
    const prevStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
    const prevEnd   = new Date(prevYear, prevMonth, 0).toISOString().split('T')[0]

    const { data: prevTxns } = await supabase
      .from('transactions')
      .select('amount, categories(type)')
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

  const hasPartner = allTxns.some(t => t.user_id !== session.user.id)

  // Recalcul selon la vue sélectionnée
  const viewTxns = vue === 'mine'
    ? allTxns.filter(t => t.user_id === session.user.id)
    : allTxns

  const viewIncome   = viewTxns.filter(t => t.categories?.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0)
  const viewExpenses = viewTxns.filter(t => t.categories?.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0)
  const viewBalance  = viewIncome - viewExpenses
  const viewRecent   = viewTxns.slice(0, 6)

  const changePercent = prevBalance !== null && prevBalance !== 0
    ? Math.round(((viewBalance - prevBalance) / Math.abs(prevBalance)) * 100)
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

      {/* Toggle vue foyer */}
      {hasPartner && (
        <div className="type-filter" style={{ marginBottom: '16px' }}>
          <button className={`type-filter-btn ${vue === 'mine' ? 'active' : ''}`} onClick={() => setVue('mine')}>
            🧑 Mes données
          </button>
          <button className={`type-filter-btn ${vue === 'foyer' ? 'active' : ''}`} onClick={() => setVue('foyer')}>
            👫 Foyer complet
          </button>
        </div>
      )}

      {/* ── Hero balance card ── */}
      <div className="balance-hero-card">
        <div className="balance-hero-label">
          {vue === 'foyer' ? 'Solde du foyer' : 'Mon solde du mois'}
        </div>
        <div className="balance-hero-amount">{fmt(viewBalance)}</div>

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
            <span className="kpi-chip-value income">{fmt(viewIncome)}</span>
          </div>
          <div className="kpi-chip">
            <span className="kpi-chip-label">Dépenses</span>
            <span className="kpi-chip-value expense">-{fmt(viewExpenses)}</span>
          </div>
          <div className="kpi-chip">
            <span className="kpi-chip-label">Solde</span>
            <span className={`kpi-chip-value ${viewBalance >= 0 ? 'income' : 'expense'}`}>
              {fmt(viewBalance)}
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

        {viewRecent.length > 0 ? (
          <div className="transaction-list">
            {viewRecent.map((t) => {
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
