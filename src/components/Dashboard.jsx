import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import TransactionForm from './TransactionForm'

const PIE_COLORS = [
  '#EF4444', '#F97316', '#3B82F6', '#EC4899',
  '#8B5CF6', '#F59E0B', '#6366F1', '#14B8A6',
  '#F87171', '#60A5FA', '#34D399', '#9CA3AF',
]

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
                    'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)

export default function Dashboard({ session, setCurrentPage }) {
  const [stats, setStats] = useState({ income: 0, expenses: 0, balance: 0 })
  const [categoryData, setCategoryData] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [recentTxns, setRecentTxns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)

    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
    const endDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

    // Transactions du mois en cours
    const { data: txns } = await supabase
      .from('transactions')
      .select('*, categories(name, type, icon, color)')
      .eq('user_id', session.user.id)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false })

    if (txns) {
      const income = txns
        .filter((t) => t.categories?.type === 'income')
        .reduce((s, t) => s + parseFloat(t.amount), 0)
      const expenses = txns
        .filter((t) => t.categories?.type === 'expense')
        .reduce((s, t) => s + parseFloat(t.amount), 0)

      setStats({ income, expenses, balance: income - expenses })
      setRecentTxns(txns.slice(0, 6))

      // Données pour le camembert
      const byCategory = {}
      txns
        .filter((t) => t.categories?.type === 'expense')
        .forEach((t) => {
          const catName = t.categories?.name || 'Autre'
          byCategory[catName] =
            (byCategory[catName] || 0) + parseFloat(t.amount)
        })
      setCategoryData(
        Object.entries(byCategory)
          .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
          .sort((a, b) => b.value - a.value)
      )
    }

    // Données sur 6 mois pour le graphique en barres
    const monthly = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const start = `${y}-${String(m).padStart(2, '0')}-01`
      const end = new Date(y, m, 0).toISOString().split('T')[0]

      const { data } = await supabase
        .from('transactions')
        .select('amount, categories(type)')
        .eq('user_id', session.user.id)
        .gte('transaction_date', start)
        .lte('transaction_date', end)

      const mIncome =
        data?.filter((t) => t.categories?.type === 'income')
             .reduce((s, t) => s + parseFloat(t.amount), 0) || 0
      const mExp =
        data?.filter((t) => t.categories?.type === 'expense')
             .reduce((s, t) => s + parseFloat(t.amount), 0) || 0

      monthly.push({ month: MONTHS_FR[m - 1], Revenus: Math.round(mIncome), Dépenses: Math.round(mExp) })
    }
    setMonthlyData(monthly)
    setLoading(false)
  }

  const savingsRate =
    stats.income > 0
      ? Math.max(0, Math.round(((stats.income - stats.expenses) / stats.income) * 100))
      : 0

  const monthName = new Date(currentYear, currentMonth - 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>Chargement du tableau de bord…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {/* En-tête */}
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Vue d'ensemble · {monthName}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Ajouter une transaction
        </button>
      </div>

      {/* Cartes statistiques */}
      <div className="stats-grid">
        <div className="stat-card income">
          <div className="stat-icon-wrapper" style={{ background: '#D1FAE5' }}>📈</div>
          <div className="stat-info">
            <span className="stat-label">Revenus du mois</span>
            <span className="stat-value" style={{ color: '#10B981' }}>{fmt(stats.income)}</span>
          </div>
        </div>

        <div className="stat-card expense">
          <div className="stat-icon-wrapper" style={{ background: '#FEE2E2' }}>📉</div>
          <div className="stat-info">
            <span className="stat-label">Dépenses du mois</span>
            <span className="stat-value" style={{ color: '#EF4444' }}>{fmt(stats.expenses)}</span>
          </div>
        </div>

        <div className="stat-card balance">
          <div className="stat-icon-wrapper" style={{ background: '#EEF2FF' }}>💰</div>
          <div className="stat-info">
            <span className="stat-label">Solde</span>
            <span className={`stat-value ${stats.balance >= 0 ? 'positive' : 'negative'}`}>
              {fmt(stats.balance)}
            </span>
          </div>
        </div>

        <div className="stat-card savings">
          <div className="stat-icon-wrapper" style={{ background: '#FEF3C7' }}>🏦</div>
          <div className="stat-info">
            <span className="stat-label">Taux d'épargne</span>
            <span
              className="stat-value"
              style={{
                color: savingsRate >= 20 ? '#10B981' : savingsRate >= 10 ? '#F59E0B' : '#EF4444',
              }}
            >
              {savingsRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="charts-grid">
        {/* Camembert — dépenses par catégorie */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">🍕 Dépenses par catégorie</h2>
          </div>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={48}
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '36px 0' }}>
              <div style={{ fontSize: '36px' }}>💸</div>
              <p style={{ marginTop: '10px', fontSize: '14px' }}>
                Aucune dépense enregistrée ce mois
              </p>
            </div>
          )}
        </div>

        {/* Barres — 6 mois */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📊 Évolution sur 6 mois</h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => `${v}€`}
                tick={{ fontSize: 11 }}
                width={58}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend />
              <Bar dataKey="Revenus" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Dépenses" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transactions récentes */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">🕐 Transactions récentes</h2>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setCurrentPage('transactions')}
          >
            Tout voir →
          </button>
        </div>

        {recentTxns.length > 0 ? (
          <div className="transaction-list">
            {recentTxns.map((t) => (
              <div key={t.id} className="transaction-item">
                <div className="transaction-category-icon">{t.categories?.icon || '📦'}</div>
                <div className="transaction-details">
                  <span className="transaction-desc">
                    {t.description || t.categories?.name || 'Transaction'}
                  </span>
                  <div className="transaction-meta">
                    <span className="transaction-date">
                      {new Date(t.transaction_date).toLocaleDateString('fr-FR')}
                    </span>
                    <span className="transaction-cat-name">{t.categories?.name || '—'}</span>
                  </div>
                </div>
                <span className={`transaction-amount ${t.categories?.type || 'expense'}`}>
                  {t.categories?.type === 'income' ? '+' : '−'}{fmt(t.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '32px 0' }}>
            <div style={{ fontSize: '36px' }}>📝</div>
            <h3 style={{ marginTop: '10px' }}>Aucune transaction ce mois</h3>
            <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '6px' }}>
              Commencez par enregistrer vos revenus et dépenses.
            </p>
            <button
              className="btn btn-primary"
              style={{ marginTop: '16px' }}
              onClick={() => setShowForm(true)}
            >
              + Ajouter une transaction
            </button>
          </div>
        )}
      </div>

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
