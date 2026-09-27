import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import OfficerLayout from '@/components/layout/OfficerLayout'
import OfficerDashboard from '@/pages/officer/OfficerDashboard'
import TenderManagement from '@/pages/officer/TenderManagement'
import ComplianceReview from '@/pages/officer/ComplianceReview'
import ComplianceDeepDive from '@/pages/officer/ComplianceDeepDive'
import CopilotChat from '@/pages/officer/CopilotChat'
import AnalyticsDashboard from '@/pages/officer/AnalyticsDashboard'
import AuditTrail from '@/pages/officer/AuditTrail'
import TenderDetailView from '@/pages/officer/TenderDetailView'
// Tender creation wizard
import TenderCreateLayout from '@/pages/officer/tender-create/TenderCreateLayout'
import Step01General from '@/pages/officer/tender-create/steps/Step01General'
import Step02Eligibility from '@/pages/officer/tender-create/steps/Step02Eligibility'
import Step03Technical from '@/pages/officer/tender-create/steps/Step03Technical'
import Step04Documents from '@/pages/officer/tender-create/steps/Step04Documents'
import Step05Items from '@/pages/officer/tender-create/steps/Step05Items'
import Step06Delivery from '@/pages/officer/tender-create/steps/Step06Delivery'
import Step07Contact from '@/pages/officer/tender-create/steps/Step07Contact'
import Step08Amounts from '@/pages/officer/tender-create/steps/Step08Amounts'
import Step09Schedule from '@/pages/officer/tender-create/steps/Step09Schedule'
import Step10Compliance from '@/pages/officer/tender-create/steps/Step10Compliance'
import Step11Additional from '@/pages/officer/tender-create/steps/Step11Additional'
import Step12Review from '@/pages/officer/tender-create/steps/Step12Review'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user && user.role === 'bidder') return <Navigate to="/" replace />
  return <>{children}</>
}

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to="/officer" replace />
  return <>{children}</>
}

export default function App() {
  const { loadFromStorage } = useAuthStore()
  useEffect(() => { loadFromStorage() }, [loadFromStorage])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
        <Route path="/register" element={<AuthRedirect><Register /></AuthRedirect>} />
        <Route path="/officer" element={<ProtectedRoute><OfficerLayout /></ProtectedRoute>}>
          <Route index element={<OfficerDashboard />} />
          <Route path="tenders" element={<TenderManagement />} />
          <Route path="tenders/:tenderId" element={<TenderDetailView />} />
          {/* Multi-page tender creation wizard */}
          <Route path="tenders/new" element={<TenderCreateLayout />}>
            <Route index element={<Navigate to="general" replace />} />
            <Route path="general" element={<Step01General />} />
            <Route path="eligibility" element={<Step02Eligibility />} />
            <Route path="technical" element={<Step03Technical />} />
            <Route path="documents" element={<Step04Documents />} />
            <Route path="items" element={<Step05Items />} />
            <Route path="delivery" element={<Step06Delivery />} />
            <Route path="contact" element={<Step07Contact />} />
            <Route path="amounts" element={<Step08Amounts />} />
            <Route path="schedule" element={<Step09Schedule />} />
            <Route path="compliance" element={<Step10Compliance />} />
            <Route path="additional" element={<Step11Additional />} />
            <Route path="review" element={<Step12Review />} />
          </Route>
          <Route path="compliance" element={<ComplianceReview />} />
          <Route path="compliance/:bidId" element={<ComplianceDeepDive />} />
          <Route path="copilot" element={<CopilotChat />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="audit" element={<AuditTrail />} />
        </Route>
        <Route path="*" element={<Navigate to="/officer" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
