import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Shield, Loader2 } from 'lucide-react'

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'bidder', organization: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      setAuth(data.user, data.access_token)
      navigate('/bidder')
    } catch (err: any) { setError(err.response?.data?.error || 'Registration failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="ambient-glow" />
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8 animate-in">
          <div className="w-10 h-10 mx-auto rounded-lg bg-[var(--gem-blue)] flex items-center justify-center mb-3"><Shield size={20} className="text-white" /></div>
          <p className="text-sm text-muted-foreground">Create vendor account</p>
        </div>
        <Card className="animate-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="text-center pb-2"><CardTitle className="text-xl">Register</CardTitle><CardDescription>Vendor / bidder account</CardDescription></CardHeader>
          <CardContent>
            {error && <div className="mb-4 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="name">Full name</Label><Input id="name" placeholder="Amit Sharma" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required autoFocus /></div>
              <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="vendor@company.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
              <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required /></div>
              <div className="space-y-2"><Label htmlFor="org">Organization</Label><Input id="org" placeholder="TechCorp Solutions Pvt Ltd" value={form.organization} onChange={e => setForm({...form, organization: e.target.value})} /></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Creating...</> : 'Create account'}</Button>
            </form>
          </CardContent>
          <Separator />
          <CardFooter className="justify-center pt-4"><p className="text-sm text-muted-foreground">Already registered? <Link to="/login" className="text-[var(--gem-blue-light)] hover:underline font-medium">Sign in</Link></p></CardFooter>
        </Card>
      </div>
    </div>
  )
}
