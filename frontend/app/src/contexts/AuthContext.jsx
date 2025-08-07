import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [homeZip, setHomeZip] = useState(null)

  // helper to extract metadata safely
  const deriveHomeZip = (u) => u?.user_metadata?.home_zip ?? null

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const sessUser = session?.user ?? null
      setUser(sessUser)
      setHomeZip(deriveHomeZip(sessUser))
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const sessUser = session?.user ?? null
        setUser(sessUser)
        setHomeZip(deriveHomeZip(sessUser))
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (data?.user) {
      setHomeZip(deriveHomeZip(data.user))
    }
    return { data, error }
  }

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // no metadata at signup; can be added later
    })
    if (data?.user) {
      setHomeZip(deriveHomeZip(data.user))
    }
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    setHomeZip(null)
    return { error }
  }

  // Persist home_zip in user_metadata and refresh local state
  const saveHomeZip = async (zip) => {
    const trimmed = (zip || '').trim()
    if (!trimmed) {
      return { error: new Error('Zip is required') }
    }
    const { data, error } = await supabase.auth.updateUser({
      data: { home_zip: trimmed },
    })
    if (!error) {
      setHomeZip(trimmed)
      // also update user in memory so consumers see new metadata immediately
      if (data?.user) {
        setUser(data.user)
      }
    }
    return { data, error }
  }

  const value = {
    user,
    loading,
    homeZip,
    saveHomeZip,
    signIn,
    signUp,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
