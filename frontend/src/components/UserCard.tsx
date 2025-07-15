import React from 'react'
import { UserSearchResult } from '../services/userService'
import { User } from 'lucide-react'

interface UserCardProps {
  user: UserSearchResult
  onClick?: (user: UserSearchResult) => void
  showBio?: boolean
}

const UserCard: React.FC<UserCardProps> = ({ user, onClick, showBio = true }) => {
  const handleClick = () => {
    onClick?.(user)
  }

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName || user.username}
              className="w-12 h-12 rounded-full object-cover"
              onError={(e) => {
                // Fallback to default avatar if image fails to load
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                target.nextElementSibling?.classList.remove('hidden')
              }}
            />
          ) : null}
          <div
            className={`w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center ${
              user.avatarUrl ? 'hidden' : ''
            }`}
          >
            <User className="w-6 h-6 text-gray-400" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {user.displayName || user.username}
            </h3>
            {user.displayName && (
              <span className="text-sm text-gray-500">@{user.username}</span>
            )}
          </div>

          {showBio && user.bio && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{user.bio}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserCard