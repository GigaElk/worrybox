import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { AlertCircle, MessageSquare, User, BarChart3, Settings } from 'lucide-react';

interface SectionErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// Feed Section Error Boundary
export const FeedErrorBoundary: React.FC<SectionErrorBoundaryProps> = ({ children, onError }) => {
  const fallback = (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
      <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Feed Unavailable</h3>
      <p className="text-gray-600 mb-4">
        We're having trouble loading your feed right now. Please try refreshing the page.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Refresh Feed
      </button>
    </div>
  );

  return (
    <ErrorBoundary
      fallback={fallback}
      section="Feed"
      onError={onError}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ErrorBoundary>
  );
};

// Profile Section Error Boundary
export const ProfileErrorBoundary: React.FC<SectionErrorBoundaryProps> = ({ children, onError }) => {
  const fallback = (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
      <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Error</h3>
      <p className="text-gray-600 mb-4">
        We couldn't load the profile information. This might be a temporary issue.
      </p>
      <div className="space-y-2">
        <button
          onClick={() => window.location.reload()}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
        <button
          onClick={() => window.history.back()}
          className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      fallback={fallback}
      section="Profile"
      onError={onError}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ErrorBoundary>
  );
};

// Analytics Section Error Boundary
export const AnalyticsErrorBoundary: React.FC<SectionErrorBoundaryProps> = ({ children, onError }) => {
  const fallback = (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
      <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Unavailable</h3>
      <p className="text-gray-600 mb-4">
        We're having trouble loading your analytics data. Your data is safe, but the display is temporarily unavailable.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Reload Analytics
      </button>
    </div>
  );

  return (
    <ErrorBoundary
      fallback={fallback}
      section="Analytics"
      onError={onError}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ErrorBoundary>
  );
};

// Settings Section Error Boundary
export const SettingsErrorBoundary: React.FC<SectionErrorBoundaryProps> = ({ children, onError }) => {
  const fallback = (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
      <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Settings Error</h3>
      <p className="text-gray-600 mb-4">
        There was an issue loading your settings. Your preferences are safe and will be restored.
      </p>
      <div className="space-y-2">
        <button
          onClick={() => window.location.reload()}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Reload Settings
        </button>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      fallback={fallback}
      section="Settings"
      onError={onError}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ErrorBoundary>
  );
};

// Generic Component Error Boundary (for smaller components)
export const ComponentErrorBoundary: React.FC<SectionErrorBoundaryProps & { componentName?: string }> = ({ 
  children, 
  onError, 
  componentName = 'Component' 
}) => {
  const fallback = (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
      <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
      <p className="text-sm text-red-700">
        {componentName} temporarily unavailable
      </p>
    </div>
  );

  return (
    <ErrorBoundary
      fallback={fallback}
      section={componentName}
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  );
};