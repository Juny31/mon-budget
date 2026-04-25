import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'

const PIE_COLORS = [
  '#EF4444', '#F97316', '#3B82F6', '#EC4899',
  '#8B5CF6', '#F59E0B', '#6366F1', '#14B8A6',
]

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
                      'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)

async function fetchMonthData(userId, year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = new Date(year, month, 0).toISOString().split('T')[0]
  const { data } = await supabase
    .from('transactions')
    .select('*, categories(name, type, icon, color)')
    .eq('user_id', userId)
    .gte('transaction_date', start)
    .lte('transaction_date', end)
  return data || []
}

export default function Reports({ session }) {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [transactions, setTransactions] = useState([])
  const [barData, setBarData] = useState([])
  const [loading, setLoading] = useState(true)

  // IA
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  useEffect(() => {
    loadReport()
  }, [selectedMonth, selectedYear])

  const loadReport = async () => {
    setLoading(true)
    setAiAnalysis('')
    setAiError('')

    const userId = session.user.id

    // Mois sélectionné
    const txns = await fetchMonthData(userId, selectedYear, selectedMonth)
    setTransactions(txns)

    // Comparaison sur 3 mois (mois-2, mois-1, mois actuel)
    const bars = []
    for (let i = 2; i >= 0; i--) {
      const d = new Date(selectedYear, selectedMonth - 1 - i, 1)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const data = await fetchMonthData(userId, y, m)
      const revenus = data.filter(t => t.categories?.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0)
      const depenses = data.filter(t => t.categories?.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0)
      bars.push({ month: MONTHS_SHORT[m - 1], Revenus: Math.round(revenus), Dépenses: Math.round(depenses) })
    }
    setBarData(bars)
    setLoading(false)
  }

  const handleAiAnalysis = async () => {
    setAiLoading(true)
    setAiError('')
    setAiAnalysis('')
    try {
      const { data, error } = await supabase.functions.invoke('analyze-budget', {
        body: {
          transactions,
          month: selectedMonth,
          year: selectedYear,
          monthName: MONTHS_FR[selectedMonth - 1],
        },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      setAiAnalysis(data.analysis)
    } catch (err) {
      setAiError(
        err.message?.includes('FunctionsFetchError') || err.message?.includes('Failed to send')
          ? "La fonction IA n'est pas encore configurée. Suivez les instructions pour créer la Supabase Edge Function."
          : err.message || "Une erreur est survenue lors de l'analyse."
      )
    }
    setAiLoading(false)
  }

  // Calculs
  const totalIncome = transactions
    .filter(t => t.categories?.type === 'income')
    .reduce((s, t) => s + parseFloat(t.amount), 0)
  const totalExpenses = transactions
    .filter(t => t.categories?.type === 'expense')
    .reduce((s, t) => s + parseFloat(t.amount), 0)
  const balance = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0
    ? Math.max(0, Math.round((balance / totalIncome) * 100))
    : 0

  // Camembert par catégorie
  const byCategory = {}
  transactions.filter(t => t.categories?.type === 'expense').forEach(t => {
    const name = t.categories?.name || 'Autre'
    byCategory[name] = (byCategory[name] || 0) + parseFloat(t.amount)
  })
  const pieData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)

  // Top 5 dépenses
  const top5 = [...transactions]
    .filter(t => t.categories?.type === 'expense')
    .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
    .slice(0, 5)

  return (
    <div>
      {/* En-tête */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Rapport mensuel</h1>
          <p className="page-subtitle">Analyse détaillée de vos finances</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select className="form-input" style={{ padding: '8px 12px', fontSize: '14px' }}
            value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
            {MONTHS_FR.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="form-input" style={{ padding: '8px 12px', fontSize: '14px' }}
            value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner" style={{ padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div className="spinner" />
          <span>Chargement du rapport…</span>
        </div>
      ) : (
        <>
          {/* Stats du mois */}
          <div className="stats-grid">
            <div className="stat-card income">
              <div className="stat-icon-wrapper" style={{ background: '#D1FAE5' }}>📈</div>
              <div className="stat-info">
                <span className="stat-label">Revenus</span>
                <span className="stat-value" style={{ color: '#10B981' }}>{fmt(totalIncome)}</span>
              </div>
            </div>
            <div className="stat-card expense">
              <div className="stat-icon-wrapper" style={{ background: '#FEE2E2' }}>📉</div>
              <div className="stat-info">
                <span className="stat-label">Dépenses</span>
                <span className="stat-value" style={{ color: '#EF4444' }}>{fmt(totalExpenses)}</span>
              </div>
            </div>
            <div className="stat-card balance">
              <div className="stat-icon-wrapper" style={{ background: '#EEF2FF' }}>💰</div>
              <div className="stat-info">
                <span className="stat-label">Solde</span>
                <span className="stat-value" style={{ color: balance >= 0 ? '#10B981' : '#EF4444' }}>{fmt(balance)}</span>
              </div>
            </div>
            <div className="stat-card savings">
              <div className="stat-icon-wrapper" style={{ background: '#FEF3C7' }}>🏦</div>
              <div className="stat-info">
                <span className="stat-label">Taux d'épargne</span>
                <span className="stat-value" style={{ color: savingsRate >= 20 ? '#10B981' : savingsRate >= 10 ? '#F59E0B' : '#EF4444' }}>
                  {savingsRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Graphiques */}
          <div className="charts-grid">
            {/* Camembert */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">🍕 Dépenses par catégorie</h2>
              </div>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={48}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: '36px 0' }}>
                  <div style={{ fontSize: '32px' }}>💸</div>
                  <p style={{ marginTop: '8px', fontSize: '14px' }}>Aucune dépense ce mois</p>
                </div>
              )}
            </div>

            {/* Barres comparatives 3 mois */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">📊 Comparaison sur 3 mois</h2>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${v}€`} tick={{ fontSize: 11 }} width={58} axisLine={false} tickLine={false} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Legend />
                  <Bar dataKey="Revenus" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Dépenses" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 5 dépenses */}
          {top5.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">🔝 Top 5 dépenses du mois</h2>
              </div>
              <div className="transaction-list">
                {top5.map((t, i) => (
                  <div key={t.id} className="transaction-item">
                    <div className="top5-rank">#{i + 1}</div>
                    <div className="transaction-category-icon">{t.categories?.icon || '📦'}</div>
                    <div className="transaction-details">
                      <span className="transaction-desc">{t.description || t.categories?.name || '—'}</span>
                      <div className="transaction-meta">
                        <span className="transaction-date">
                          {new Date(t.transaction_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="transaction-cat-name">{t.categories?.name || '—'}</span>
                      </div>
                    </div>
                    <span className="transaction-amount expense">−{fmt(t.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analyse IA */}
          <div className="card ai-analysis-card">
            <div className="card-header">
              <h2 className="card-title">🤖 Analyse IA de ce mois</h2>
              {!aiLoading && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAiAnalysis}
                  disabled={transactions.length === 0}
                >
                  {aiAnalysis ? '🔄 Ré-analyser' : '✨ Analyser'}
                </button>
              )}
            </div>

            {aiLoading && (
              <div className="ai-loading">
                <div className="ai-loading-dots">
                  <span /><span /><span />
                </div>
                <p>Claude analyse vos finances…</p>
              </div>
            )}

            {aiError && (
              <div className="alert alert-error" style={{ marginTop: '12px' }}>
                ⚠️ {aiError}
              </div>
            )}

            {aiAnalysis && !aiLoading && (
              <div className="ai-result">
                {aiAnalysis}
              </div>
            )}

            {!aiAnalysis && !aiLoading && !aiError && (
              <p className="ai-placeholder">
                Cliquez sur <strong>Analyser</strong> pour obtenir des conseils personnalisés basés sur vos transactions de {MONTHS_FR[selectedMonth - 1].toLowerCase()}.
                <br />
                <span style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '6px', display: 'block' }}>
                  Nécessite la Supabase Edge Function "analyze-budget" configurée avec une clé API Anthropic.
                </span>
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
