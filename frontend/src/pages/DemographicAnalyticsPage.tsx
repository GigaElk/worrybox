import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import DemographicAnalyticsDashboard from '../components/DemographicAnalyticsDashboard'
import TrendingTopics from '../components/TrendingTopics'

const DemographicAnalyticsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Navigation */}
        <div className="mb-8">
          <Link 
            to="/analytics" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Analytics
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Demographics Dashboard */}
          <div className="lg:col-span-3">
            <DemographicAnalyticsDashboard />
          </div>

          {/* Sidebar with Trending Topics */}
          <div className="lg:col-span-1 space-y-6">
            <TrendingTopics limit={15} />
            
            {/* Additional Info Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">About Demographics</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>
                  Our demographic analytics provide insights into community patterns while 
                  maintaining strict privacy protection.
                </p>
                <p>
                  All data is anonymized and aggregated with minimum sample sizes to ensure 
                  individual users cannot be identified.
                </p>
                <p>
                  These insights help us understand how to better support our community's 
                  mental health needs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DemographicAnalyticsPage