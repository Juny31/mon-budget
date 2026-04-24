import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function TransactionForm({ onClose, onSuccess, userId }) {
  const [categories, setCategories] = useState([])
  const [type, setType] = useState('expense')
  const [form, setForm] = useState({
    category_id: '',
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCategories()
  }, [type])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('type', type)
      .order('name')

    setCategories(data || [])
    if (data && data.length > 0) {
      setForm((prev) => ({ ...prev, category_id: data[0].id }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || !form.category_id || !form.transaction_date) {
      setError('Veuillez remplir tous les champs obligatoires.')
      return
    }

    setLoading(true)
    setError('')

    const { error: dbError } = await supabase.from('transactions').insert({
      user_id: userId,
      category_id: parseInt(form.category_id),
      amount: parseFloat(form.amount),
      description: form.description.trim() || null,
      transaction_date: form.transaction_date,
    })

    if (dbError) {
      setError("Erreur lors de l'ajout : " + dbError.message)
    } else {
      onSuccess()
    }
    setLoading(false)
  }

  // Fermer en cliquant sur l'overlay
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Nouvelle transaction</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {/* Sélection du type */}
          <div className="type-tabs">
            <button
              type="button"
              className={`type-tab expense ${type === 'expense' ? 'selected' : ''}`}
              onClick={() => setType('expense')}
            >
              📉 Dépense
            </button>
            <button
              type="button"
              className={`type-tab income ${type === 'income' ? 'selected' : ''}`}
              onClick={() => setType('income')}
            >
              📈 Revenu
            </button>
          </div>

          {/* Catégorie */}
          <div className="form-group">
            <label htmlFor="category">Catégorie *</label>
            <select
              id="category"
              className="form-select"
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              required
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Montant */}
          <div className="form-group">
            <label htmlFor="amount">Montant (€) *</label>
            <input
              id="amount"
              type="number"
              className="form-input"
              placeholder="0,00"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              autoFocus
            />
          </div>

          {/* Date */}
          <div className="form-group">
            <label htmlFor="date">Date *</label>
            <input
              id="date"
              type="date"
              className="form-input"
              value={form.transaction_date}
              onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
              required
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">Description (optionnel)</label>
            <input
              id="description"
              type="text"
              className="form-input"
              placeholder="Ex : Courses Carrefour, Facture EDF…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {error && <div className="alert alert-error">⚠️ {error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Ajout…' : '✓ Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
