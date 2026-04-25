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

// ── Calcul du score de santé financière ─────────────────────────────────────
function computeHealthScore(totalIncome, totalExpenses, balance, byCategory) {
  if (totalIncome === 0) return null

  const savingsRate = Math.max(0, (balance / totalIncome) * 100)
  const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  const topCatRatio = categories.length > 0 ? (categories[0][1] / totalExpenses) * 100 : 0
  const housingAmount = (byCategory['Loyer / Logement'] || 0) + (byCategory['Loyer'] || 0)
  const housingRatio = (housingAmount / totalIncome) * 100

  // Points par indicateur (total 100)
  const scoreEpargne = savingsRate >= 20 ? 30 : savingsRate >= 10 ? 20 : savingsRate > 0 ? 10 : 0
  const scoreSolde    = balance > 0 ? 20 : 0
  const scoreLoyer    = housingAmount === 0 ? 20 : housingRatio <= 33 ? 20 : housingRatio <= 45 ? 12 : 5
  const scoreDiversite = categories.length === 0 ? 15 : topCatRatio <= 40 ? 30 : topCatRatio <= 60 ? 20 : 10

  const total = scoreEpargne + scoreSolde + scoreLoyer + scoreDiversite

  // Conseils automatiques
  const tips = []
  if (balance < 0)
    tips.push({ icon: '🚨', color: '#EF4444', text: 'Solde négatif ce mois — tes dépenses dépassent tes revenus.' })
  if (savingsRate < 10 && balance >= 0)
    tips.push({ icon: '💡', color: '#F59E0B', text: `Taux d'épargne de ${Math.round(savingsRate)}% — vise 10 % minimum pour te constituer une réserve.` })
  if (savingsRate >= 20)
    tips.push({ icon: '🏆', color: '#10B981', text: `Excellent taux d'épargne de ${Math.round(savingsRate)}% ! Continue comme ça.` })
  if (housingAmount > 0 && housingRatio > 33)
    tips.push({ icon: '🏠', color: '#F97316', text: `Ton logement représente ${Math.round(housingRatio)}% de tes revenus (règle du tiers : max 33 %).` })
  if (categories.length > 0 && topCatRatio > 60)
    tips.push({ icon: '📊', color: '#8B5CF6', text: `${categories[0][0]} concentre ${Math.round(topCatRatio)}% de tes dépenses — pense à équilibrer.` })
  if (categories.length >= 4 && topCatRatio <= 40)
    tips.push({ icon: '✅', color: '#10B981', text: 'Bonne diversification de tes dépenses entre plusieurs catégories.' })
  if (tips.length === 0)
    tips.push({ icon: '👍', color: '#10B981', text: 'Tes finances sont équilibrées ce mois. Beau travail !' })

  // Indicateurs détaillés
  const indicators = [
    {
      label: "Taux d'épargne",
      value: `${Math.round(savingsRate)} %`,
      score: scoreEpargne,
      max: 30,
      color: savingsRate >= 20 ? '#10B981' : savingsRate >= 10 ? '#F59E0B' : '#EF4444',
    },
    {
      label: 'Solde du mois',
      value: fmt(balance),
      score: scoreSolde,
      max: 20,
      color: balance >= 0 ? '#10B981' : '#EF4444',
    },
    {
      label: 'Ratio logement / revenus',
      value: housingAmount > 0 ? `${Math.round(housingRatio)} %` : 'N/A',
      score: scoreLoyer,
      max: 20,
      color: housingRatio <= 33 ? '#10B981' : housingRatio <= 45 ? '#F59E0B' : '#EF4444',
    },
    {
      label: 'Diversification',
      value: `${categories.length} catégorie${categories.length > 1 ? 's' : ''}`,
      score: scoreDiversite,
      max: 30,
      color: topCatRatio <= 40 ? '#10B981' : topCatRatio <= 60 ? '#F59E0B' : '#EF4444',
    },
  ]

  const grade =
    total >= 80 ? { label: 'Excellent', color: '#10B981', emoji: '🌟' } :
    total >= 60 ? { label: 'Bien',      color: '#3B82F6', emoji: '👍' } :
    total >= 40 ? { label: 'Moyen',     color: '#F59E0B', emoji: '⚠️'  } :
                  { label: 'À revoir',  color: '#EF4444', emoji: '🔴' }

  return { total, grade, tips, indicators }
}

export default function Reports({ session }) {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [transactions, setTransactions] = useState([])
  const [barData, setBarData] = useState([])
  const [loading, setLoading] = useState(true)

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  useEffect(() => { loadReport() }, [selectedMonth, selectedYear])

  const loadReport = async () => {
    setLoading(true)
    const userId = session.user.id
    const txns = await fetchMonthData(userId, selectedYear, selectedMonth)
    setTransactions(txns)

    // Comparaison sur 3 mois
    const bars = []
    for (let i = 2; i >= 0; i--) {
      const d = new Date(selectedYear, selectedMonth - 1 - i, 1)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const data = await fetchMonthData(userId, y, m)
      const revenus  = data.filter(t => t.categories?.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0)
      const depenses = data.filter(t => t.categories?.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0)
      bars.push({ month: MONTHS_SHORT[m - 1], Revenus: Math.round(revenus), Dépenses: Math.round(depenses) })
    }
    setBarData(bars)
    setLoading(false)
  }

  // Calculs
  const totalIncome   = transactions.filter(t => t.categories?.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0)
  const totalExpenses = transactions.filter(t => t.categories?.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0)
  const balance       = totalIncome - totalExpenses
  const savingsRate   = totalIncome > 0 ? Math.max(0, Math.round((balance / totalIncome) * 100)) : 0

  const byCategory = {}
  transactions.filter(t => t.categories?.type === 'expense').forEach(t => {
    const name = t.categories?.name || 'Autre'
    byCategory[name] = (byCategory[name] || 0) + parseFloat(t.amount)
  })
  const pieData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)

  const top5 = [...transactions]
    .filter(t => t.categories?.type === 'expense')
    .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
    .slice(0, 5)

  const health = transactions.length > 0
    ? computeHealthScore(totalIncome, totalExpenses, balance, byCategory)
    : null

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
                  <Bar dataKey="Revenus"  fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
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

          {/* Score de santé financière */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">💚 Score de santé financière</h2>
            </div>

            {!health ? (
              <p style={{ color: '#6B7280', fontSize: '14px', padding: '12px 0' }}>
                Ajoutez des transactions pour obtenir votre score.
              </p>
            ) : (
              <div className="health-score-wrapper">
                {/* Jauge circulaire + score */}
                <div className="health-score-top">
                  <div className="health-gauge-container">
                    <svg viewBox="0 0 120 120" className="health-gauge-svg">
                      {/* Piste de fond */}
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#F3F4F6" strokeWidth="12" />
                      {/* Arc coloré — on commence en haut (−90°) */}
                      <circle
                        cx="60" cy="60" r="50"
                        fill="none"
                        stroke={health.grade.color}
                        strokeWidth="12"
                        strokeDasharray={`${(health.total / 100) * 314} 314`}
                        strokeLinecap="round"
                        transform="rotate(-90 60 60)"
                        style={{ transition: 'stroke-dasharray 0.8s ease' }}
                      />
                      <text x="60" y="55" textAnchor="middle" fontSize="26" fontWeight="700" fill={health.grade.color}>{health.total}</text>
                      <text x="60" y="72" textAnchor="middle" fontSize="11" fill="#6B7280">/100</text>
                    </svg>
                    <div className="health-grade-label" style={{ color: health.grade.color }}>
                      {health.grade.emoji} {health.grade.label}
                    </div>
                  </div>

                  {/* Indicateurs détaillés */}
                  <div className="health-indicators">
                    {health.indicators.map((ind) => (
                      <div key={ind.label} className="health-indicator-row">
                        <div className="health-indicator-info">
                          <span className="health-indicator-label">{ind.label}</span>
                          <span className="health-indicator-value" style={{ color: ind.color }}>{ind.value}</span>
                        </div>
                        <div className="health-bar-track">
                          <div
                            className="health-bar-fill"
                            style={{ width: `${(ind.score / ind.max) * 100}%`, background: ind.color }}
                          />
                        </div>
                        <span className="health-indicator-pts">{ind.score}/{ind.max} pts</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conseils */}
                <div className="health-tips">
                  {health.tips.map((tip, i) => (
                    <div key={i} className="health-tip-row">
                      <span className="health-tip-icon">{tip.icon}</span>
                      <span className="health-tip-text" style={{ borderLeftColor: tip.color }}>{tip.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
