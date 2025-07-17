import React from 'react'
import SchedulingStats from './SchedulingStats'
import ScheduledPostsManager from './ScheduledPostsManager'

const SchedulingDashboard: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Scheduling Dashboard</h1>
        <p className="text-gray-600">Manage your scheduled worry posts and view scheduling statistics.</p>
      </div>

      <SchedulingStats />
      
      <ScheduledPostsManager />
    </div>
  )
}

export default SchedulingDashboard