import React from 'react'
import ModerationStats from './ModerationStats'
import ModerationQueue from './ModerationQueue'

const ModerationDashboard: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Moderation Dashboard</h1>
        <p className="text-gray-600">
          Monitor and manage comment moderation across the platform. AI-powered moderation with manual review capabilities.
        </p>
      </div>

      <ModerationStats />
      
      <ModerationQueue />
    </div>
  )
}

export default ModerationDashboard