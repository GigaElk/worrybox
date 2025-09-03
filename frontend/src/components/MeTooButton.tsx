import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { meTooService } from '../services/meTooService'
import { Users, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface MeTooButtonProps {
  postId: string
  onMeTooChange?: (hasMeToo: boolean, meTooCount: number, similarWorryCount: number) => void
  className?: string
  showCount?: boolean
}

const MeTooButton: React.FC<MeTooButtonProps> = ({ 
  postId, 
  onMeTooChange, 
  className = '', 
  showCount = true 
}) => {
  const { isAuthenticated } = useAuth()
  const [hasMeToo, setHasMeToo] = useState(false)
  const [meTooCount, setMeTooCount] = useState(0)
  const [similarWorryCount, setSimilarWorryCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const loadMeTooData = async () => {
      try {
        setIsChecking(true)
        
        // Always load MeToo count and similar worry count
        const [count, similarCount] = await Promise.all([
          meTooService.getMeTooCount(postId),
          meTooService.getSimilarWorryCount(postId)
        ])
        
        setMeTooCount(count)
        setSimilarWorryCount(similarCount)
        
        // Only check if user has MeToo'd if authenticated
        if (isAuthenticated) {
          const userHasMeToo = await meTooService.hasMeToo(postId)
          setHasMeToo(userHasMeToo)
        }
      } catch (error) {
        console.error('Failed to load MeToo data:', error)
      } finally {
        setIsChecking(false)
      }
    }

    loadMeTooData()
  }, [postId, isAuthenticated])

  const handleMeToo = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to respond to posts')
      return
    }

    setIsLoading(true)
    try {
      if (hasMeToo) {
        await meTooService.removeMeToo(postId)
        setHasMeToo(false)
        const newMeTooCount = meTooCount - 1
        const newSimilarWorryCount = similarWorryCount - 1
        setMeTooCount(newMeTooCount)
        setSimilarWorryCount(newSimilarWorryCount)
        
        // Dispatch meTooUpdated CustomEvent for MeTooCount component to listen
        window.dispatchEvent(new CustomEvent('meTooUpdated', {
          detail: { postId, meTooCount: newMeTooCount, similarWorryCount: newSimilarWorryCount }
        }))
        
        onMeTooChange?.(false, newMeTooCount, newSimilarWorryCount)
      } else {
        await meTooService.addMeToo(postId)
        setHasMeToo(true)
        const newMeTooCount = meTooCount + 1
        const newSimilarWorryCount = similarWorryCount + 1
        setMeTooCount(newMeTooCount)
        setSimilarWorryCount(newSimilarWorryCount)
        
        // Dispatch meTooUpdated CustomEvent for MeTooCount component to listen
        window.dispatchEvent(new CustomEvent('meTooUpdated', {
          detail: { postId, meTooCount: newMeTooCount, similarWorryCount: newSimilarWorryCount }
        }))
        
        onMeTooChange?.(true, newMeTooCount, newSimilarWorryCount)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update response')
    } finally {
      setIsLoading(false)
    }
  }

  const getMeTooText = () => {
    if (hasMeToo) {
      return 'You also worry about this'
    }
    return 'Me too'
  }

  const getSimilarWorryText = () => {
    if (similarWorryCount === 0) return ''
    if (similarWorryCount === 1) return '1 person has similar worries'
    return `${similarWorryCount} people have similar worries`
  }

  return (
    <button
      onClick={handleMeToo}
      disabled={isLoading || isChecking || !isAuthenticated}
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
        hasMeToo
          ? 'text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100'
          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
      } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title={isAuthenticated ? getMeTooText() : 'Log in to respond to posts'}
      aria-label={isAuthenticated ? getMeTooText() : 'Log in to respond to posts'}
    >
      {isLoading || isChecking ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Users 
          className={`w-5 h-5 ${hasMeToo ? 'fill-current' : ''}`} 
        />
      )}
      {showCount && (
        <span className="text-sm font-medium" title={getSimilarWorryText()}>
          {similarWorryCount > 0 ? similarWorryCount : ''}
        </span>
      )}
    </button>
  )
}

export default MeTooButton