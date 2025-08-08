import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'
import { Loader2, Cloud, Zap, Wind, CloudRain, Sun } from 'lucide-react'

export const LoginScreen = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (isLogin) {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
        }
      } else {
        const { error } = await signUp(email, password)
        if (error) {
          setError(error.message)
        } else {
          setMessage('Check your email for the confirmation link!')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="mx-auto w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Animated brand panel (hidden on small screens) */}
        <div className="relative hidden md:flex items-center justify-center rounded-2xl bg-slate-900/70 border border-slate-700 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.10),transparent_60%)]" />
          <div className="relative z-10 text-center">
            <h2 className="text-4xl font-semibold tracking-tight text-white drop-shadow">Impact Weather</h2>
            <p className="mt-2 text-slate-300">Stay ahead of the storm</p>
          </div>
          {/* Floating weather icons */}
          <div className="absolute inset-0 pointer-events-none">
            <FloatingIcon Icon={Cloud} delay={0}   className="left-[10%] top-[15%]" />
            <FloatingIcon Icon={Wind}  delay={0.6} className="left-[20%] top-[65%]" />
            <FloatingIcon Icon={Sun}   delay={1.2} className="left-[45%] top-[25%]" />
            <FloatingIcon Icon={CloudRain} delay={1.8} className="left-[70%] top-[55%]" />
            <FloatingIcon Icon={Zap}   delay={2.2} className="left-[80%] top-[20%]" />
          </div>
        </div>

        {/* Right: Auth card */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/15 ring-1 ring-blue-500/30">
                <Zap className="h-6 w-6 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-white">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
              <p className="text-slate-300">Sign {isLogin ? 'in' : 'up'} to Impact Weather</p>
            </div>

            <Card className="border-slate-700 bg-slate-900/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">{isLogin ? 'Sign in' : 'Sign up'}</CardTitle>
                <CardDescription className="text-slate-300">
                  {isLogin
                    ? 'Enter your credentials to access your dashboard.'
                    : 'Create an account to start receiving weather insights.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-200">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus-visible:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-200">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus-visible:ring-blue-500"
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  {message && (
                    <Alert>
                      <AlertDescription>{message}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLogin ? 'Sign in' : 'Create account'}
                  </Button>
                </form>

                <div className="mt-6 text-center text-slate-300">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm text-blue-400 hover:text-blue-300 underline"
                  >
                    {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                  </button>
                </div>
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-xs text-slate-400">
              Real-time alerts • Radar • Outlooks • Storm reports
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Small floating icon component with looped motion
const FloatingIcon = ({ Icon, delay = 0, className = '' }) => {
  return (
    <motion.div
      className={`absolute ${className}`}
      initial={{ y: 0, opacity: 0.8 }}
      animate={{ y: [0, -12, 0], opacity: [0.8, 1, 0.8] }}
      transition={{ duration: 6, delay, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Icon className="h-8 w-8 text-slate-300/80" />
    </motion.div>
  )
}
