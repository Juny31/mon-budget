import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useFmt } from '../lib/CurrencyContext'

const CATEGORIES = [
  'Électronique', 'Mode & Vêtements', 'Maison & Déco', 'Loisirs',
  'Voyage', 'Sport', 'Beauté & Santé', 'Livres & Médias', 'Autre',
]

const PRIORITY = {
  urgent:   { label: '🔥 Urgent',   color: 'var(--danger)',   bg: 'rgba(248,113,113,0.12)'  },
  soon:     { label: '⏳ Bientôt',  color: 'var(--warning)',  bg: 'rgba(251,191,36,0.12)'   },
  someday:  { label: '☁️ Un jour',  color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.15)' },
}

const STATUS = {
  waiting:   { label: 'En attente',  color: 'var(--primary)',  bg: 'rgba(129,140,248,0.12)' },
  postponed: { label: 'Reporté',     color: 'var(--warning)',  bg: 'rgba(251,191,36,0.12)'  },
  bought:    { label: '✅ Acheté',    color: 'var(--success)',  bg: 'rgba(74,222,128,0.12)'  },
  abandoned: { label: 'Abandonné',   color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.12)'},
}

const EMPTY_FORM = {
  name: '', price: '', category: 'Autre', priority: 'soon',
  url: '', image_url: '', notes: '',
}

export default function WishList({ session }) {
  const fmt = useFmt()
  const [items, setItems]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [editItem, setEditItem]         = useState(null)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [saving, setSaving]             = useState(false)
  const [monthlySavings, setMonthlySavings] = useState(null)
  const [filterStatus, setFilterStatus] = useState('active') // active | bought | all
  const [imgErrors, setImgErrors]       = useState({})

  useEffect(() => { fetchItems(); fetchMonthlySavings() }, [])

  // Récupère l'épargne moyenne sur les 3 derniers mois
  const fetchMonthlySavings = async () => {
    const now = new Date()
    let total = 0; let months = 0
    for (let i = 1; i <= 3; i++) {
      const d     = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
      const { data } = await supabase
        .from('transactions')
        .select('amount, categories(type)')
        .eq('user_id', session.user.id)
        .gte('transaction_date', start)
        .lte('transaction_date', end)
      if (data && data.length > 0) {
        const inc = data.filter(t => t.categories?.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0)
        const exp = data.filter(t => t.categories?.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0)
        const bal = inc - exp
        if (bal > 0) { total += bal; months++ }
      }
    }
    setMonthlySavings(months > 0 ? total / months : null)
  }

  const fetchItems = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('wish_list_items')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit = (item) => {
    setEditItem(item)
    setForm({
      name: item.name, price: item.price, category: item.category,
      priority: item.priority, url: item.url || '', image_url: item.image_url || '', notes: item.notes || '',
    })
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      user_id:   session.user.id,
      name:      form.name.trim(),
      price:     parseFloat(form.price) || 0,
      category:  form.category,
      priority:  form.priority,
      url:       form.url.trim() || null,
      image_url: form.image_url.trim() || null,
      notes:     form.notes.trim() || null,
    }
    if (editItem) {
      await supabase.from('wish_list_items').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('wish_list_items').insert({ ...payload, status: 'waiting', times_postponed: 0 })
    }
    setSaving(false)
    setShowForm(false)
    fetchItems()
  }

  const handlePostpone = async (item) => {
    await supabase.from('wish_list_items').update({
      status: 'postponed',
      times_postponed: item.times_postponed + 1,
    }).eq('id', item.id)
    fetchItems()
  }

  const handleBuy = async (item) => {
    await supabase.from('wish_list_items').update({
      status: 'bought',
      bought_at: new Date().toISOString(),
    }).eq('id', item.id)
    fetchItems()
  }

  const handleAbandon = async (item) => {
    await supabase.from('wish_list_items').update({ status: 'abandoned' }).eq('id', item.id)
    fetchItems()
  }

  const handleReactivate = async (item) => {
    await supabase.from('wish_list_items').update({ status: 'waiting' }).eq('id', item.id)
    fetchItems()
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cet article ?')) return
    await supabase.from('wish_list_items').delete().eq('id', id)
    fetchItems()
  }

  // Calcul "dans X mois"
  const monthsNeeded = (price) => {
    if (!monthlySavings || monthlySavings <= 0 || !price) return null
    return Math.ceil(price / monthlySavings)
  }

  const activeItems    = items.filter(i => i.status === 'waiting' || i.status === 'postponed')
  const boughtItems    = items.filter(i => i.status === 'bought')
  const abandonedItems = items.filter(i => i.status === 'abandoned')
  const displayItems   = filterStatus === 'active' ? activeItems
                       : filterStatus === 'bought'  ? boughtItems
                       : items

  const totalWished  = activeItems.reduce((s, i) => s + parseFloat(i.price || 0), 0)
  const totalBought  = boughtItems.reduce((s, i) => s + parseFloat(i.price || 0), 0)
  const monthsForAll = monthsNeeded(totalWished)

  return (
    <div>
      {/* En-tête */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Liste de souhaits</h1>
          <p className="page-subtitle">Priorise tes achats · épargne mieux</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Ajouter</button>
      </div>

      {/* Résumé */}
      <div className="wl-summary-row">
        <div className="wl-summary-card">
          <span className="wl-summary-label">Total souhaité</span>
          <span className="wl-summary-value" style={{ color: 'var(--danger)' }}>{fmt(totalWished)}</span>
        </div>
        <div className="wl-summary-card">
          <span className="wl-summary-label">Épargne moy./mois</span>
          <span className="wl-summary-value" style={{ color: monthlySavings > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
            {monthlySavings != null ? fmt(monthlySavings) : '—'}
          </span>
        </div>
        <div className="wl-summary-card">
          <span className="wl-summary-label">Pour tout acheter</span>
          <span className="wl-summary-value" style={{ color: 'var(--primary)' }}>
            {monthsForAll != null ? `${monthsForAll} mois` : '—'}
          </span>
        </div>
        <div className="wl-summary-card">
          <span className="wl-summary-label">Déjà acheté 🎉</span>
          <span className="wl-summary-value" style={{ color: 'var(--success)' }}>{fmt(totalBought)}</span>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { key: 'active',  label: `En attente (${activeItems.length})`  },
          { key: 'bought',  label: `Achetés (${boughtItems.length})`     },
          { key: 'all',     label: `Tout (${items.length})`              },
        ].map(f => (
          <button
            key={f.key}
            className={`type-filter-btn ${filterStatus === f.key ? 'active' : ''}`}
            style={{
              padding: '7px 16px',
              borderRadius: '20px',
              border: filterStatus === f.key ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
              background: filterStatus === f.key ? 'var(--primary-light)' : 'transparent',
              color: filterStatus === f.key ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
            onClick={() => setFilterStatus(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grille d'articles */}
      {loading ? (
        <div className="loading-spinner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '60px' }}>
          <div className="spinner" />
          <span>Chargement…</span>
        </div>
      ) : displayItems.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '44px' }}>🛍️</div>
          <h3 style={{ marginTop: '12px' }}>
            {filterStatus === 'bought' ? 'Aucun achat encore' : 'Liste vide'}
          </h3>
          <p>
            {filterStatus === 'active'
              ? 'Ajoute des articles que tu voudrais acheter.'
              : filterStatus === 'bought'
              ? 'Tes articles achetés apparaîtront ici.'
              : 'Commence par ajouter un article.'}
          </p>
          {filterStatus !== 'bought' && (
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={openAdd}>
              + Ajouter un article
            </button>
          )}
        </div>
      ) : (
        <div className="wl-grid">
          {displayItems.map(item => {
            const pr   = PRIORITY[item.priority]  || PRIORITY.soon
            const st   = STATUS[item.status]       || STATUS.waiting
            const mo   = monthsNeeded(parseFloat(item.price || 0))
            const isActive  = item.status === 'waiting' || item.status === 'postponed'
            const isBought  = item.status === 'bought'
            const hasImage  = item.image_url && !imgErrors[item.id]
            const canAfford = monthlySavings != null && parseFloat(item.price || 0) <= monthlySavings

            return (
              <div key={item.id} className={`wl-card ${isBought ? 'wl-card-bought' : ''}`}>

                {/* Image ou placeholder */}
                <div className="wl-card-image">
                  {hasImage ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      onError={() => setImgErrors(p => ({ ...p, [item.id]: true }))}
                    />
                  ) : (
                    <div className="wl-card-image-placeholder">🛍️</div>
                  )}
                  {/* Badge "peut se permettre" */}
                  {canAfford && isActive && (
                    <div className="wl-afford-badge">💰 Tu peux l'acheter !</div>
                  )}
                </div>

                {/* Contenu */}
                <div className="wl-card-body">
                  <div className="wl-card-top">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="wl-card-name" title={item.name}>{item.name}</h3>
                      <span className="wl-card-category">{item.category}</span>
                    </div>
                    <div className="wl-card-price">{fmt(item.price)}</div>
                  </div>

                  {/* Badges */}
                  <div className="wl-card-badges">
                    <span className="wl-badge" style={{ color: pr.color, background: pr.bg }}>{pr.label}</span>
                    <span className="wl-badge" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                    {item.times_postponed > 0 && (
                      <span className="wl-badge" style={{ color: 'var(--text-muted)', background: 'rgba(100,116,139,0.1)' }}>
                        {item.times_postponed >= 5 ? '🏆' : '💪'} Reporté {item.times_postponed}×
                      </span>
                    )}
                  </div>

                  {/* Indicateur "dans X mois" */}
                  {mo !== null && isActive && (
                    <div className="wl-months-indicator">
                      <div className="wl-months-bar">
                        <div
                          className="wl-months-fill"
                          style={{ width: `${Math.min(100, (1 / mo) * 100)}%` }}
                        />
                      </div>
                      <span className="wl-months-label">
                        {mo <= 1 ? '✅ Accessible dès ce mois !' : `📅 Dans environ ${mo} mois`}
                      </span>
                    </div>
                  )}

                  {/* Notes */}
                  {item.notes && (
                    <p className="wl-card-notes">{item.notes}</p>
                  )}

                  {/* Date d'achat */}
                  {isBought && item.bought_at && (
                    <p className="wl-bought-date">
                      Acheté le {new Date(item.bought_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="wl-card-actions">
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm wl-link-btn">
                        🔗 Voir
                      </a>
                    )}
                    {isActive && (
                      <>
                        <button className="btn btn-sm wl-btn-postpone" onClick={() => handlePostpone(item)}>
                          ⏸ Reporter
                        </button>
                        <button className="btn btn-sm wl-btn-buy" onClick={() => handleBuy(item)}>
                          ✓ Acheté
                        </button>
                      </>
                    )}
                    {(isBought || item.status === 'abandoned') && (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleReactivate(item)}>
                        ↩ Réactiver
                      </button>
                    )}
                    <div style={{ flex: 1 }} />
                    <button className="btn-icon" onClick={() => openEdit(item)} title="Modifier">✏️</button>
                    <button className="btn-icon" onClick={() => handleDelete(item.id)} title="Supprimer">🗑️</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bouton flottant mobile */}
      <button className="btn-add-mobile" onClick={openAdd} aria-label="Ajouter un article">+</button>

      {/* Modal formulaire */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editItem ? 'Modifier l\'article' : '✨ Nouvel article'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form className="modal-form" onSubmit={handleSave}>

              <div className="form-group">
                <label>Nom de l'article *</label>
                <input
                  className="form-input"
                  placeholder="Ex: MacBook Pro, Air Max, Canapé…"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Prix estimé (€)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Priorité</label>
                  <select className="form-select" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                    <option value="urgent">🔥 Urgent</option>
                    <option value="soon">⏳ Bientôt</option>
                    <option value="someday">☁️ Un jour</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Catégorie</label>
                <select className="form-select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>🔗 Lien produit (optionnel)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://amazon.fr/..."
                  value={form.url}
                  onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>🖼️ URL de l'image (optionnel)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={form.image_url}
                  onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
                />
                {form.image_url && (
                  <img
                    src={form.image_url}
                    alt="Aperçu"
                    style={{ marginTop: '8px', height: '80px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)' }}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                )}
              </div>

              <div className="form-group">
                <label>Notes (optionnel)</label>
                <textarea
                  className="form-input"
                  placeholder="Pourquoi tu veux cet article, dans quelle couleur…"
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '…' : editItem ? 'Enregistrer' : 'Ajouter à la liste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
