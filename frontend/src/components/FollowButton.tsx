import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Loader2, UserPlus, UserCheck } from 'lucide-react';

interface FollowButtonProps {
  authorId: string;
  initialIsFollowing: boolean;
}

const FollowButton: React.FC<FollowButtonProps> = ({ authorId, initialIsFollowing }) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  const handleFollowToggle = async () => {
    if (!user || isLoading) return;

    setIsLoading(true);
    const originalFollowState = isFollowing;

    // Optimistic update
    setIsFollowing(!originalFollowState);

    try {
      const response = await api.post(`/users/${authorId}/follow`);
      // Update state with response from server
      setIsFollowing(response.data.data.isFollowing);
    } catch (error) { 
      console.error('Failed to toggle follow state', error);
      // Revert on error
      setIsFollowing(originalFollowState);
      // Optionally show a toast notification here
    }
    setIsLoading(false);
  };

  // Don't render the button if there is no logged-in user or if it's the user's own post
  if (!user || user.userId === authorId) {
    return null;
  }

  return (
    <button
      onClick={handleFollowToggle}
      disabled={isLoading}
      className={`px-3 py-1 text-sm font-semibold rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isFollowing
          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
      }`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className="w-4 h-4 mr-1" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4 mr-1" />
          Follow
        </>
      )}
    </button>
  );
};

export default FollowButton;
