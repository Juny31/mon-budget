import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)

function getProgressColor(percent) {
  if (percent >= 100) return '#EF4444'
  if (percent >= 80) return '#F59E0B'
  return '#10B981'
}

export default function BudgetGoals({ session }) {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [categories, setCategories] = useState([])
  const [goals, setGoals] = useState({})     // { category_id: amount }
  const [spent, setSpent] = useState({})     // { category_id: amount }
  const [editingId, setEditingId] = useState(null)
  const [goalInput, setGoalInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { fetchData() }, [selectedMonth, selectedYear])

  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus()
  }, [editingId])

  const fetchData = async () => {
    setLoading(true)

    // Catégories de dépenses
    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .eq('type', 'expense')
      .order('name')

    // Objectifs du mois
    const { data: goalRows } = await supabase
      .from('budget_goals')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('month', selectedMonth)
      .eq('year', selectedYear)

    // Dépenses réelles du mois (toutes catégories expense)
    const start = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
    const end = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0]

    const { data: txns } = await supabase
      .from('transactions')
      .select('category_id, amount, categories(type)')
      .eq('user_id', session.user.id)
      .gte('transaction_date', start)
      .lte('transaction_date', end)

    setCategories(cats || [])

    const goalsMap = {}
    goalRows?.forEach((g) => { goalsMap[g.category_id] = parseFloat(g.amount) })
    setGoals(goalsMap)

    const spentMap = {}
    txns
      ?.filter((t) => t.categories.type === 'expense')
      .forEach((t) => {
        spentMap[t.category_id] = (spentMap[t.category_id] || 0) + parseFloat(t.amount)
      })
    setSpent(spentMap)

    setLoading(false)
  }

  const startEditing = (catId, currentAmount) => {
    setEditingId(catId)
    setGoalInput(currentAmount ? String(currentAmount) : '')
  }

  const saveGoal = async (categoryId) => {
    const amount = parseFloat(goalInput)
    if (!amount || amount <= 0) {
      setEditingId(null)
      return
    }
    setSaving(true)

    const { error } = await supabase.from('budget_goals').upsert(
      {
        user_id: session.user.id,
        category_id: categoryId,
        amount,
        month: selectedMonth,
        year: selectedYear,
      },
      { onConflict: 'user_id,category_id,month,year' }
    )

    if (!error) {
      setGoals((prev) => ({ ...prev, [categoryId]: amount }))
    }
    setEditingId(null)
    setSaving(false)
  }

  const deleteGoal = async (categoryId) => {
    await supabase
      .from('budget_goals')
      .delete()
      .eq('user_id', session.user.id)
      .eq('category_id', categoryId)
      .eq('month', selectedMonth)
      .eq('year', selectedYear)

    setGoals((prev) => {
      const next = { ...prev }
      delete next[categoryId]
      return next
    })
  }

  // Statistiques globales
  const totalBudget = Object.values(goals).reduce((s, v) => s + v, 0)
  const totalSpentInBudget = Object.entries(spent)
    .filter(([catId]) => goals[catId] !== undefined)
    .reduce((s, [, v]) => s + v, 0)
  const overCount = categories.filter(
    (c) => goals[c.id] && (spent[c.id] || 0) > goals[c.id]
  ).length

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i)

  return (
    <div>
      {/* En-tête */}
      <div className="page-header">
        <h1 className="page-title">Objectifs budgétaires</h1>
        <p className="page-subtitle">
          Définissez vos plafonds de dépenses et suivez votre progression
        </p>
      </div>

      {/* Sélecteur de mois */}
      <div className="transactions-controls" style={{ marginBottom: '22px' }}>
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
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Résumé global (si des objectifs existent) */}
      {Object.keys(goals).length > 0 && (
        <div className="stats-grid" style={{ marginBottom: '22px' }}>
          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ background: '#EEF2FF' }}>🎯</div>
            <div className="stat-info">
              <span className="stat-label">Budget total défini</span>
              <span className="stat-value">{fmt(totalBudget)}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ background: '#FEE2E2' }}>💸</div>
            <div className="stat-info">
              <span className="stat-label">Dépensé (catégories suivies)</span>
              <span className="stat-value">{fmt(totalSpentInBudget)}</span>
            </div>
          </div>
          <div className="stat-card">
            <div
              className="stat-icon-wrapper"
              style={{ background: overCount > 0 ? '#FEE2E2' : '#D1FAE5' }}
            >
              {overCount > 0 ? '⚠️' : '✅'}
            </div>
            <div className="stat-info">
              <span className="stat-label">Catégories dépassées</span>
              <span
                className="stat-value"
                style={{ color: overCount > 0 ? '#EF4444' : '#10B981' }}
              >
                {overCount}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ background: '#D1FAE5' }}>💰</div>
            <div className="stat-info">
              <span className="stat-label">Reste à dépenser</span>
              <span
                className="stat-value"
                style={{
                  color: totalBudget - totalSpentInBudget >= 0 ? '#10B981' : '#EF4444',
                }}
              >
                {fmt(Math.max(0, totalBudget - totalSpentInBudget))}
              </span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div
          style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}
        >
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>Chargement…</span>
          </div>
        </div>
      ) : (
        <>
          {Object.keys(goals).length === 0 && (
            <div
              className="alert alert-info"
              style={{ marginBottom: '20px' }}
            >
              💡 Cliquez sur <strong>+ Définir</strong> pour fixer un plafond de dépenses par catégorie.
            </div>
          )}

          <div className="budget-grid">
            {categories.map((cat) => {
              const goalAmt = goals[cat.id]
              const spentAmt = spent[cat.id] || 0
              const isEditing = editingId === cat.id
              const percent = goalAmt
                ? Math.min((spentAmt / goalAmt) * 100, 100)
                : 0
              const rawPercent = goalAmt ? (spentAmt / goalAmt) * 100 : 0
              const isOver = goalAmt && spentAmt > goalAmt
              const color = goalAmt ? getProgressColor(rawPercent) : '#9CA3AF'

              return (
                <div key={cat.id} className="budget-card">
                  {/* Entête de la carte */}
                  <div className="budget-card-header">
                    <div className="budget-cat-info">
                      <span className="budget-cat-icon">{cat.icon}</span>
                      <span className="budget-cat-name">{cat.name}</span>
                    </div>
                    {goalAmt && !isEditing && (
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => startEditing(cat.id, goalAmt)}
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          style={{ color: '#EF4444' }}
                          onClick={() => deleteGoal(cat.id)}
                          title="Supprimer l'objectif"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Saisie d'objectif */}
                  {isEditing ? (
                    <div className="budget-input-group">
                      <input
                        ref={inputRef}
                        type="number"
                        value={goalInput}
                        onChange={(e) => setGoalInput(e.target.value)}
                        placeholder="Montant €"
                        step="10"
                        min="1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveGoal(cat.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                      />
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => saveGoal(cat.id)}
                        disabled={saving}
                      >
                        ✓
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditingId(null)}
                      >
                        ✕
                      </button>
                    </div>
                  ) : goalAmt ? (
                    /* Affichage de la progression */
                    <>
                      <div className="budget-amounts">
                        <span className="budget-spent" style={{ color }}>
                          {fmt(spentAmt)}
                        </span>
                        <span className="budget-limit">/ {fmt(goalAmt)}</span>
                      </div>

                      <div className="progress-bar-track">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${percent}%`, background: color }}
                        />
                      </div>

                      <div className="budget-status">
                        <span className="budget-percent" style={{ color }}>
                          {Math.round(rawPercent)}%
                        </span>
                        <span
                          className="budget-remaining"
                          style={isOver ? { color: '#EF4444', fontWeight: 600 } : {}}
                        >
                          {isOver
                            ? `⚠️ Dépassé de ${fmt(spentAmt - goalAmt)}`
                            : `Reste : ${fmt(goalAmt - spentAmt)}`}
                        </span>
                      </div>
                    </>
                  ) : (
                    /* Pas d'objectif défini */
                    <div className="budget-no-goal">
                      <span className="budget-no-goal-text">
                        Dépensé : {fmt(spentAmt)} · Pas de limite
                      </span>
                      <button
                        className="btn btn-sm"
                        style={{
                          color: '#4F46E5',
                          background: '#EEF2FF',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '5px 12px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '13px',
                          flexShrink: 0,
                        }}
                        onClick={() => startEditing(cat.id, null)}
                      >
                        + Définir
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
