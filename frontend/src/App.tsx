import { Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import FeedPage from './pages/FeedPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ProfilePage from './pages/ProfilePage'
import EditProfilePage from './pages/EditProfilePage'
import WorryAnalysisPage from './pages/WorryAnalysisPage'
import PricingPage from './pages/PricingPage'
import AnalyticsPage from './pages/AnalyticsPage'
import DemographicAnalyticsPage from './pages/DemographicAnalyticsPage'
import WellnessDashboard from './pages/WellnessDashboard'
import ExercisesPage from './pages/ExercisesPage'
import CopingTechniquesPage from './pages/CopingTechniquesPage'
import ExerciseDetail from './components/ExerciseDetail'
import CopingTechniqueDetail from './components/CopingTechniqueDetail'
import ResolutionStoriesPage from './pages/ResolutionStoriesPage'
import { AuthProvider } from './contexts/AuthContext'
import { SubscriptionProvider } from './contexts/SubscriptionContext'

function App() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate initial app loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Worrybox...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="feed" element={<FeedPage />} />
              <Route path="wellness" element={<WellnessDashboard />} />
              <Route path="wellness/exercises" element={<ExercisesPage />} />
              <Route path="wellness/exercises/:id" element={<ExerciseDetail />} />
              <Route path="wellness/techniques" element={<CopingTechniquesPage />} />
              <Route path="wellness/techniques/:id" element={<CopingTechniqueDetail />} />
              <Route path="resolution-stories" element={<ResolutionStoriesPage />} />
            </Route>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/analysis/:postId" element={<WorryAnalysisPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/demographics" element={<DemographicAnalyticsPage />} />
          </Routes>
        </div>
      </SubscriptionProvider>
    </AuthProvider>
  )
}

export default App