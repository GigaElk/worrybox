import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { ErrorDisplay } from '../components/ErrorDisplay'
import { WorryAnalysisErrorType } from '../services/worryAnalysisService'

describe('Error Handling - Core Components', () => {
  it('should display error message', () => {
    render(
      <ErrorDisplay
        message="Test error message"
        errorType="network"
        canRetry={false}
      />
    )

    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('should show retry button when canRetry is true', () => {
    const onRetry = vi.fn()

    render(
      <ErrorDisplay
        message="Network error"
        errorType="network"
        canRetry={true}
        onRetry={onRetry}
      />
    )

    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('should not show retry button for privacy errors', () => {
    render(
      <ErrorDisplay
        message="Privacy violation"
        errorType={WorryAnalysisErrorType.PRIVACY_VIOLATION}
        canRetry={false}
      />
    )

    expect(screen.queryByText('Try Again')).not.toBeInTheDocument()
  })

  it('should display inline variant correctly', () => {
    render(
      <ErrorDisplay
        message="Inline error"
        variant="inline"
        size="small"
      />
    )

    expect(screen.getByText('Inline error')).toBeInTheDocument()
  })
})