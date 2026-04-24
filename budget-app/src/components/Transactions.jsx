import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import TransactionForm from './TransactionForm'

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)

export default function Transactions({ session }) {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [filter, setFilter] = useState('all')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { fetchTransactions() }, [selectedMonth, selectedYear])

  const fetchTransactions = async () => {
    setLoading(true)
    const start = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
    const end = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0]

    const { data } = await supabase
      .from('transactions')
      .select('*, categories(name, type, icon, color)')
      .eq('user_id', session.user.id)
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    setTransactions(data || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette transaction ?')) return
    setDeleting(id)
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
    setDeleting(null)
  }

  const filtered =
    filter === 'all'
      ? transactions
      : transactions.filter((t) => t.categories.type === filter)

  const totalIncome = transactions
    .filter((t) => t.categories.type === 'income')
    .reduce((s, t) => s + parseFloat(t.amount), 0)

  const totalExpenses = transactions
    .filter((t) => t.categories.type === 'expense')
    .reduce((s, t) => s + parseFloat(t.amount), 0)

  const balance = totalIncome - totalExpenses

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div>
      {/* En-tête */}
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">Historique de vos revenus et dépenses</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Ajouter
        </button>
      </div>

      {/* Sélecteur de mois et filtres */}
      <div className="transactions-controls">
        <div className="month-selector">
          <span style={{ fontSize: '13px', color: '#6B7280' }}>📅</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {MONTHS_FR.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="type-filter">
          {[['all', 'Tout'], ['income', '📈 Revenus'], ['expense', '📉 Dépenses']].map(
            ([val, label]) => (
              <button
                key={val}
                className={`type-filter-btn ${filter === val ? 'active' : ''}`}
                onClick={() => setFilter(val)}
              >
                {label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Résumé du mois */}
      <div className="transactions-summary">
        <div className="summary-chip income">
          <span className="label">Revenus</span>
          <span className="value" style={{ color: '#10B981' }}>{fmt(totalIncome)}</span>
        </div>
        <div className="summary-chip expense">
          <span className="label">Dépenses</span>
          <span className="value" style={{ color: '#EF4444' }}>{fmt(totalExpenses)}</span>
        </div>
        <div className="summary-chip">
          <span className="label">Solde</span>
          <span className="value" style={{ color: balance >= 0 ? '#10B981' : '#EF4444' }}>
            {fmt(balance)}
          </span>
        </div>
      </div>

      {/* Liste des transactions */}
      <div className="card">
        {loading ? (
          <div
            className="loading-spinner"
            style={{ padding: '40px 0', alignItems: 'center', justifyContent: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <div className="spinner"></div>
            <span>Chargement…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💸</div>
            <h3>Aucune transaction</h3>
            <p>
              {filter !== 'all'
                ? 'Aucune transaction de ce type pour cette période.'
                : 'Commencez par enregistrer vos revenus et dépenses.'}
            </p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              + Ajouter une transaction
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize: '13px',
                color: '#6B7280',
                marginBottom: '8px',
                fontWeight: 500,
              }}
            >
              {filtered.length} transaction{filtered.length > 1 ? 's' : ''}
            </div>
            <div className="transaction-list">
              {filtered.map((t) => (
                <div key={t.id} className="transaction-item">
                  <div className="transaction-category-icon">{t.categories.icon}</div>
                  <div className="transaction-details">
                    <span className="transaction-desc">
                      {t.description || t.categories.name}
                    </span>
                    <div className="transaction-meta">
                      <span className="transaction-date">
                        {new Date(t.transaction_date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <span className="transaction-cat-name">{t.categories.name}</span>
                    </div>
                  </div>
                  <span className={`transaction-amount ${t.categories.type}`}>
                    {t.categories.type === 'income' ? '+' : '−'}{fmt(t.amount)}
                  </span>
                  <button
                    className="btn-icon"
                    onClick={() => handleDelete(t.id)}
                    disabled={deleting === t.id}
                    title="Supprimer"
                  >
                    {deleting === t.id ? '⏳' : '🗑️'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showForm && (
        <TransactionForm
          userId={session.user.id}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchTransactions() }}
        />
      )}
    </div>
  )
}
