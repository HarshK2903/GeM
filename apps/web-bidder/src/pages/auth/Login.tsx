import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Shield, Loader2, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      setAuth(data.user, data.access_token)
      navigate('/bidder')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="ambient-glow" />
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8 animate-in">
          <div className="w-10 h-10 mx-auto rounded-lg bg-[var(--gem-blue)] flex items-center justify-center mb-3">
            <Shield size={20} className="text-white" />
          </div>
          <p className="text-sm text-muted-foreground">Bidder Portal</p>
        </div>
        <Card className="animate-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <div className="mb-4 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="vendor@company.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Signing in...</> : 'Sign in'}
              </Button>
            </form>
          </CardContent>
          <Separator />
          <CardFooter className="justify-center pt-4">
            <p className="text-sm text-muted-foreground">New vendor? <Link to="/register" className="text-[var(--gem-blue-light)] hover:underline font-medium">Register</Link></p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
