import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [isError, setIsError] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
      },
    })

    if (error) {
      setMessage('Erreur : ' + error.message)
      setIsError(true)
    } else {
      setMessage('✉️ Lien envoyé ! Vérifiez votre boîte email et cliquez sur le lien pour vous connecter.')
      setIsError(false)
    }

    setLoading(false)
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">💰</div>
        <h1>BudgetApp</h1>
        <p className="auth-subtitle">
          Gérez vos finances personnelles simplement et en toute sécurité
        </p>

        <form className="auth-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Adresse email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
          >
            {loading ? '⏳ Envoi en cours...' : '✨ Envoyer le lien magique'}
          </button>
        </form>

        {message && (
          <div
            className={`alert ${isError ? 'alert-error' : 'alert-success'}`}
            style={{ marginTop: '16px', textAlign: 'left' }}
          >
            {message}
          </div>
        )}

        <p className="auth-footer">
          🔒 Connexion sans mot de passe · Sécurisé · Gratuit
        </p>
      </div>
    </div>
  )
}
