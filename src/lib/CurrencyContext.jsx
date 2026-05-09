import { createContext, useContext, useState } from 'react'

const CurrencyContext = createContext()

export const CURRENCIES = [
  { code: 'EUR', label: '€ Euro' },
  { code: 'XAF', label: 'FCFA (Afrique centrale)' },
  { code: 'XOF', label: 'FCFA (Afrique de l\'Ouest)' },
  { code: 'USD', label: '$ Dollar US' },
  { code: 'GBP', label: '£ Livre sterling' },
]

export function formatAmount(n, currency = 'EUR') {
  const amount = n || 0
  if (currency === 'XAF' || currency === 'XOF') {
    return (
      new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(
        Math.round(amount)
      ) + ' FCFA'
    )
  }
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(
    () => localStorage.getItem('budget_currency') || 'EUR'
  )

  const setCurrency = (code) => {
    localStorage.setItem('budget_currency', code)
    setCurrencyState(code)
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}

// Hook pratique : retourne une fonction fmt liée à la devise courante
export function useFmt() {
  const { currency } = useCurrency()
  return (n) => formatAmount(n, currency)
}
