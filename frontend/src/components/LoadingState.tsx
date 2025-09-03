import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  inline?: boolean;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  size = 'md',
  text = 'Loading...',
  className = '',
  inline = false,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  if (inline) {
    return (
      <span className={`inline-flex items-center space-x-2 ${className}`}>
        <Loader2 className={`${sizeClasses[size]} animate-spin text-gray-500`} />
        {text && (
          <span className={`${textSizeClasses[size]} text-gray-600`}>
            {text}
          </span>
        )}
      </span>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-gray-500 mb-2`} />
      {text && (
        <p className={`${textSizeClasses[size]} text-gray-600`}>
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingState;