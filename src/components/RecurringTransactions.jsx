import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)

function frequencyLabel(r) {
  if (r.frequency === 'monthly') return `Tous les ${r.day_of_month} du mois`
  if (r.frequency === 'weekly') return `Chaque ${DAYS_FR[r.day_of_week]}`
  if (r.frequency === 'yearly') {
    const d = new Date(r.start_date + 'T00:00:00')
    return `Chaque année le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
  }
  return ''
}

function nextOccurrence(r) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (r.frequency === 'monthly') {
    let d = new Date(today.getFullYear(), today.getMonth(), r.day_of_month)
    if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, r.day_of_month)
    return d
  }
  if (r.frequency === 'weekly') {
    let d = new Date(today)
    while (d.getDay() !== r.day_of_week) d.setDate(d.getDate() + 1)
    if (d.getTime() === today.getTime()) d.setDate(d.getDate() + 7)
    return d
  }
  if (r.frequency === 'yearly') {
    const start = new Date(r.start_date + 'T00:00:00')
    let d = new Date(today.getFullYear(), start.getMonth(), start.getDate())
    if (d <= today) d = new Date(today.getFullYear() + 1, start.getMonth(), start.getDate())
    return d
  }
  return null
}

const EMPTY_FORM = {
  description: '',
  amount: '',
  category_id: '',
  frequency: 'monthly',
  day_of_month: new Date().getDate() > 28 ? 28 : new Date().getDate(),
  day_of_week: 1,
  start_date: new Date().toISOString().split('T')[0],
}

export default function RecurringTransactions({ session }) {
  const [recurrings, setRecurrings] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(null)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [{ data: rec }, { data: cats }] = await Promise.all([
      supabase
        .from('recurring_transactions')
        .select('*, categories(name, type, icon, color)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name, type, icon').order('name'),
    ])
    setRecurrings(rec || [])
    setCategories(cats || [])
    setLoading(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      user_id: session.user.id,
      description: form.description,
      amount: parseFloat(form.amount),
      category_id: form.category_id || null,
      frequency: form.frequency,
      day_of_month: form.frequency === 'monthly' ? parseInt(form.day_of_month) : null,
      day_of_week: form.frequency === 'weekly' ? parseInt(form.day_of_week) : null,
      start_date: form.start_date,
      is_active: true,
    }
    const { error } = await supabase.from('recurring_transactions').insert(payload)
    if (!error) {
      setShowForm(false)
      setForm(EMPTY_FORM)
      fetchData()
    }
    setSaving(false)
  }

  const handleToggle = async (r) => {
    setToggling(r.id)
    await supabase
      .from('recurring_transactions')
      .update({ is_active: !r.is_active })
      .eq('id', r.id)
    setRecurrings((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, is_active: !x.is_active } : x))
    )
    setToggling(null)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette récurrence ? Les transactions déjà générées seront conservées.')) return
    setDeleting(id)
    await supabase.from('recurring_transactions').delete().eq('id', id)
    setRecurrings((prev) => prev.filter((x) => x.id !== id))
    setDeleting(null)
  }

  const activeCount = recurrings.filter((r) => r.is_active).length

  return (
    <div>
      {/* En-tête */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Transactions récurrentes</h1>
          <p className="page-subtitle">
            {activeCount} récurrence{activeCount !== 1 ? 's' : ''} active{activeCount !== 1 ? 's' : ''} — générées automatiquement à chaque ouverture
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Ajouter
        </button>
      </div>

      {/* Liste */}
      <div className="card">
        {loading ? (
          <div className="loading-spinner" style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div className="spinner" />
            <span>Chargement…</span>
          </div>
        ) : recurrings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔁</div>
            <h3>Aucune récurrence</h3>
            <p>Ajoutez votre loyer, abonnements ou salaire pour qu'ils soient enregistrés automatiquement chaque mois.</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              + Ajouter une récurrence
            </button>
          </div>
        ) : (
          <div className="recurring-list">
            {recurrings.map((r) => {
              const next = nextOccurrence(r)
              const isIncome = r.categories?.type === 'income'
              return (
                <div key={r.id} className={`recurring-item ${!r.is_active ? 'inactive' : ''}`}>
                  <div className="recurring-icon">{r.categories?.icon || '🔁'}</div>
                  <div className="recurring-details">
                    <div className="recurring-name">{r.description}</div>
                    <div className="recurring-meta">
                      <span className="recurring-freq">{frequencyLabel(r)}</span>
                      {r.categories && (
                        <span className="recurring-cat">{r.categories.name}</span>
                      )}
                      {next && r.is_active && (
                        <span className="recurring-next">
                          Prochain : {next.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`recurring-amount ${isIncome ? 'income' : 'expense'}`}>
                    {isIncome ? '+' : '−'}{fmt(r.amount)}
                  </span>
                  <div className="recurring-actions">
                    {/* Toggle */}
                    <button
                      className={`toggle-btn ${r.is_active ? 'on' : 'off'}`}
                      onClick={() => handleToggle(r)}
                      disabled={toggling === r.id}
                      title={r.is_active ? 'Désactiver' : 'Activer'}
                    >
                      {toggling === r.id ? '⏳' : r.is_active ? '✅' : '⏸️'}
                    </button>
                    {/* Supprimer */}
                    <button
                      className="btn-icon"
                      onClick={() => handleDelete(r.id)}
                      disabled={deleting === r.id}
                      title="Supprimer"
                    >
                      {deleting === r.id ? '⏳' : '🗑️'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nouvelle récurrence</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <input
                  className="form-input"
                  placeholder="Ex: Loyer, Netflix, Salaire…"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Montant (€) *</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0,00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Catégorie</label>
                  <select
                    className="form-input"
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  >
                    <option value="">— Choisir —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Fréquence *</label>
                <select
                  className="form-input"
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                >
                  <option value="monthly">📅 Mensuelle</option>
                  <option value="weekly">📆 Hebdomadaire</option>
                  <option value="yearly">🗓️ Annuelle</option>
                </select>
              </div>

              {form.frequency === 'monthly' && (
                <div className="form-group">
                  <label className="form-label">Jour du mois (1-28)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    max="28"
                    value={form.day_of_month}
                    onChange={(e) => setForm({ ...form, day_of_month: e.target.value })}
                    required
                  />
                </div>
              )}

              {form.frequency === 'weekly' && (
                <div className="form-group">
                  <label className="form-label">Jour de la semaine</label>
                  <select
                    className="form-input"
                    value={form.day_of_week}
                    onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
                  >
                    {DAYS_FR.map((d, i) => (
                      <option key={i} value={i}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Date de début</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Enregistrement…' : '✅ Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
