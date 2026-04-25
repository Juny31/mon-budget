import { useState, useEffect, useMemo } from 'react'
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
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState(null)

  // Filtres avancés
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')

  useEffect(() => { fetchTransactions() }, [selectedMonth, selectedYear])
  useEffect(() => { fetchCategories() }, [])

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

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name, type, icon')
      .order('name')
    setCategories(data || [])
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette transaction ?')) return
    setDeleting(id)
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
    setDeleting(null)
  }

  const resetAdvancedFilters = () => {
    setSearchTerm('')
    setSelectedCategory('')
    setMinAmount('')
    setMaxAmount('')
  }

  const activeFilterCount = [
    searchTerm,
    selectedCategory,
    minAmount,
    maxAmount,
  ].filter(Boolean).length

  // Application de tous les filtres
  const filtered = useMemo(() => {
    let result = filter === 'all'
      ? transactions
      : transactions.filter((t) => t.categories?.type === filter)

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      result = result.filter(
        (t) =>
          t.description?.toLowerCase().includes(q) ||
          t.categories?.name?.toLowerCase().includes(q)
      )
    }

    if (selectedCategory) {
      result = result.filter((t) => t.categories?.name === selectedCategory)
    }

    if (minAmount !== '') {
      result = result.filter((t) => parseFloat(t.amount) >= parseFloat(minAmount))
    }

    if (maxAmount !== '') {
      result = result.filter((t) => parseFloat(t.amount) <= parseFloat(maxAmount))
    }

    return result
  }, [transactions, filter, searchTerm, selectedCategory, minAmount, maxAmount])

  const totalIncome = transactions
    .filter((t) => t.categories?.type === 'income')
    .reduce((s, t) => s + parseFloat(t.amount), 0)

  const totalExpenses = transactions
    .filter((t) => t.categories?.type === 'expense')
    .reduce((s, t) => s + parseFloat(t.amount), 0)

  const balance = totalIncome - totalExpenses

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  // Catégories disponibles selon le filtre type actif
  const availableCategories = categories.filter(
    (c) => filter === 'all' || c.type === filter
  )

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

      {/* Sélecteur de mois et filtres de type */}
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
                onClick={() => { setFilter(val); setSelectedCategory('') }}
              >
                {label}
              </button>
            )
          )}
        </div>

        {/* Bouton filtres avancés */}
        <button
          className={`btn-advanced-filter ${showAdvanced ? 'active' : ''}`}
          onClick={() => setShowAdvanced((v) => !v)}
        >
          🔍 Filtres
          {activeFilterCount > 0 && (
            <span className="filter-badge">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* Panneau filtres avancés */}
      {showAdvanced && (
        <div className="advanced-filters-panel">
          <div className="advanced-filters-grid">
            {/* Recherche */}
            <div className="filter-field">
              <label className="filter-label">🔤 Recherche</label>
              <input
                type="text"
                className="form-input filter-input"
                placeholder="Description ou catégorie…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Catégorie */}
            <div className="filter-field">
              <label className="filter-label">🏷️ Catégorie</label>
              <select
                className="form-input filter-input"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Toutes les catégories</option>
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Montant min */}
            <div className="filter-field">
              <label className="filter-label">💶 Montant min (€)</label>
              <input
                type="number"
                className="form-input filter-input"
                placeholder="0"
                min="0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
            </div>

            {/* Montant max */}
            <div className="filter-field">
              <label className="filter-label">💶 Montant max (€)</label>
              <input
                type="number"
                className="form-input filter-input"
                placeholder="∞"
                min="0"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button className="btn-reset-filters" onClick={resetAdvancedFilters}>
              ✕ Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

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
              {activeFilterCount > 0
                ? 'Aucun résultat pour ces filtres.'
                : filter !== 'all'
                ? 'Aucune transaction de ce type pour cette période.'
                : 'Commencez par enregistrer vos revenus et dépenses.'}
            </p>
            {activeFilterCount > 0 ? (
              <button className="btn btn-secondary" onClick={resetAdvancedFilters}>
                Réinitialiser les filtres
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                + Ajouter une transaction
              </button>
            )}
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
              {activeFilterCount > 0 && (
                <span style={{ color: '#4F46E5', marginLeft: '6px' }}>
                  ({activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''} actif{activeFilterCount > 1 ? 's' : ''})
                </span>
              )}
            </div>
            <div className="transaction-list">
              {filtered.map((t) => (
                <div key={t.id} className="transaction-item">
                  <div className="transaction-category-icon">{t.categories?.icon || '📦'}</div>
                  <div className="transaction-details">
                    <span className="transaction-desc">
                      {t.description || t.categories?.name || '—'}
                    </span>
                    <div className="transaction-meta">
                      <span className="transaction-date">
                        {new Date(t.transaction_date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <span className="transaction-cat-name">{t.categories?.name || '—'}</span>
                    </div>
                  </div>
                  <span className={`transaction-amount ${t.categories?.type}`}>
                    {t.categories?.type === 'income' ? '+' : '−'}{fmt(t.amount)}
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
