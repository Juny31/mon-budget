import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function HouseholdSettings({ session }) {
  const [household, setHousehold]   = useState(null)
  const [members, setMembers]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [joinCode, setJoinCode]     = useState('')
  const [houseName, setHouseName]   = useState('')
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')
  const [creating, setCreating]     = useState(false)
  const [joining, setJoining]       = useState(false)
  const [copied, setCopied]         = useState(false)

  useEffect(() => { fetchHousehold() }, [])

  const fetchHousehold = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('household_members')
      .select('*, households(*)')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (data?.households) {
      setHousehold(data.households)
      const { data: allMembers } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', data.household_id)
        .order('joined_at', { ascending: true })
      setMembers(allMembers || [])
    } else {
      setHousehold(null)
      setMembers([])
    }
    setLoading(false)
  }

  const handleCreate = async () => {
    setCreating(true)
    setError('')
    setSuccess('')

    let code = generateCode()
    // Ensure uniqueness (retry once if collision)
    const { data: existing } = await supabase
      .from('households').select('id').eq('invite_code', code).maybeSingle()
    if (existing) code = generateCode()

    const name = houseName.trim() || 'Notre foyer'
    const { data: hh, error: err } = await supabase
      .from('households')
      .insert({ name, invite_code: code, created_by: session.user.id })
      .select()
      .single()

    if (err) { setError('Erreur lors de la création. Réessaie.'); setCreating(false); return }

    await supabase.from('household_members').insert({
      household_id: hh.id,
      user_id:      session.user.id,
      role:         'owner',
      display_name: session.user.email.split('@')[0],
    })

    await fetchHousehold()
    setCreating(false)
    setSuccess('Foyer créé ! Partage le code à ton/ta partenaire.')
  }

  const handleJoin = async () => {
    if (joinCode.trim().length < 6) return
    setJoining(true)
    setError('')
    setSuccess('')

    const { data: hh } = await supabase
      .from('households')
      .select('*')
      .eq('invite_code', joinCode.toUpperCase().trim())
      .maybeSingle()

    if (!hh) { setError('Code invalide. Vérifie le code et réessaie.'); setJoining(false); return }

    // Check not already a member
    const { data: already } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', hh.id)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (already) { setError('Tu es déjà membre de ce foyer.'); setJoining(false); return }

    // Check not already in another household
    const { data: otherMembership } = await supabase
      .from('household_members')
      .select('id')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (otherMembership) { setError('Tu es déjà membre d\'un autre foyer. Quitte-le d\'abord.'); setJoining(false); return }

    const { error: joinErr } = await supabase.from('household_members').insert({
      household_id: hh.id,
      user_id:      session.user.id,
      role:         'member',
      display_name: session.user.email.split('@')[0],
    })

    if (joinErr) { setError('Erreur lors de la connexion. Réessaie.'); setJoining(false); return }

    await fetchHousehold()
    setJoining(false)
    setSuccess('🎉 Tu as rejoint le foyer avec succès !')
  }

  const handleLeave = async () => {
    if (!confirm('Quitter le foyer ? Tu ne verras plus les données de ton/ta partenaire. Tes données restent intactes.')) return
    await supabase
      .from('household_members')
      .delete()
      .eq('household_id', household.id)
      .eq('user_id', session.user.id)

    // If owner and last member, delete household
    const remaining = members.filter(m => m.user_id !== session.user.id)
    if (remaining.length === 0 && household.created_by === session.user.id) {
      await supabase.from('households').delete().eq('id', household.id)
    }

    setHousehold(null)
    setMembers([])
    setSuccess('Tu as quitté le foyer.')
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(household.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(true) // fallback
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const myInitial = (session.user.email?.[0] || '?').toUpperCase()

  if (loading) return (
    <div className="loading-spinner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '80px' }}>
      <div className="spinner" />
      <span>Chargement…</span>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">👫 Compte partagé</h1>
        <p className="page-subtitle">Gérez votre budget à deux en temps réel</p>
      </div>

      {error   && <div className="alert alert-error"   style={{ marginBottom: '18px' }}>⚠️ {error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '18px' }}>{success}</div>}

      {!household ? (
        /* ── Pas encore de foyer ── */
        <div className="hh-onboarding">

          {/* Explication */}
          <div className="card hh-explainer">
            <div className="hh-explainer-icon">👫</div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>
                Gérez vos finances ensemble
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Une fois liés, vous verrez les transactions, récurrences, objectifs et liste de souhaits de chacun —
                dans la même app, en temps réel.
                Chacun reste maître de ses propres données.
              </p>
            </div>
          </div>

          <div className="hh-options-grid">

            {/* Créer */}
            <div className="card">
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏠</div>
              <h2 className="card-title" style={{ marginBottom: '8px' }}>Créer un foyer</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
                Tu obtiens un code à 6 caractères à partager à ton/ta partenaire.
              </p>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Nom du foyer (optionnel)</label>
                <input
                  className="form-input"
                  placeholder="Notre foyer, Famille Martin…"
                  value={houseName}
                  onChange={e => setHouseName(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleCreate} disabled={creating}>
                {creating ? '…' : '✨ Créer le foyer'}
              </button>
            </div>

            {/* Rejoindre */}
            <div className="card">
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔗</div>
              <h2 className="card-title" style={{ marginBottom: '8px' }}>Rejoindre un foyer</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
                Ton/ta partenaire a déjà créé un foyer ? Entre son code d'invitation.
              </p>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Code d'invitation</label>
                <input
                  className="form-input hh-code-input"
                  placeholder="ABC123"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  maxLength={6}
                />
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={handleJoin}
                disabled={joining || joinCode.length < 6}
              >
                {joining ? '…' : '🤝 Rejoindre'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Dans un foyer ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '620px' }}>

          {/* Info foyer */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text)' }}>
                  🏠 {household.name}
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Créé le {new Date(household.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <span className="hh-status-badge">
                ✅ Foyer actif
              </span>
            </div>

            {/* Membres */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                Membres ({members.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {members.map(m => {
                  const isMe = m.user_id === session.user.id
                  const initial = (m.display_name || '?')[0].toUpperCase()
                  return (
                    <div key={m.id} className="hh-member-row">
                      <div className={`hh-member-avatar ${isMe ? 'me' : 'partner'}`}>{initial}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {m.display_name || 'Membre'}
                          {isMe && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400' }}>(toi)</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                          {m.role === 'owner' ? '👑 Créateur·ice' : '👤 Membre'} · Rejoint le {new Date(m.joined_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      {isMe && (
                        <span style={{ fontSize: '11px', background: 'var(--primary-light)', color: 'var(--primary)', padding: '3px 8px', borderRadius: '20px', fontWeight: '600' }}>
                          Toi
                        </span>
                      )}
                    </div>
                  )
                })}

                {/* Slot vide si un seul membre */}
                {members.length < 2 && (
                  <div className="hh-member-row" style={{ opacity: 0.5, borderStyle: 'dashed' }}>
                    <div className="hh-member-avatar" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>?</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      En attente de ton/ta partenaire…
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Code d'invitation */}
            <div className="hh-invite-box">
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
                Code d'invitation
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span className="hh-invite-code">{household.invite_code}</span>
                <button className="btn btn-ghost btn-sm" onClick={copyCode} style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                  {copied ? '✅ Copié !' : '📋 Copier le code'}
                </button>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px' }}>
                Partage ce code à ton/ta partenaire pour qu'il/elle rejoigne le foyer depuis son compte.
              </p>
            </div>
          </div>

          {/* Zone danger — quitter */}
          <div className="card" style={{ borderColor: 'rgba(248,113,113,0.2)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
              ⚠️ Quitter le foyer
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
              Tu ne verras plus les données de ton/ta partenaire.
              Tes propres données sont conservées intégralement.
            </p>
            <button className="btn btn-danger btn-sm" onClick={handleLeave}>
              Quitter le foyer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
