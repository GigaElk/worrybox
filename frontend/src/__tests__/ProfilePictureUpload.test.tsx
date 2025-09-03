import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ProfilePictureUpload from '../components/ProfilePictureUpload'
import { profilePictureService } from '../services/profilePictureService'
import toast from 'react-hot-toast'

// Mock dependencies
vi.mock('../services/profilePictureService')
vi.mock('react-hot-toast')

const mockProfilePictureService = profilePictureService as any
const mockToast = toast as any

// Mock FileReader
const mockFileReader = {
  readAsDataURL: vi.fn(),
  result: 'data:image/jpeg;base64,mockbase64',
  onload: null as any,
}

Object.defineProperty(global, 'FileReader', {
  writable: true,
  value: vi.fn(() => mockFileReader),
})

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn(() => true),
})

describe('ProfilePictureUpload', () => {
  const defaultProps = {}

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementations
    mockProfilePictureService.validateFile.mockReturnValue({
      isValid: true,
      error: null,
    })
    
    mockProfilePictureService.uploadProfilePicture.mockResolvedValue({
      profilePictureUrl: 'https://example.com/new-avatar.jpg',
    })
    
    mockProfilePictureService.deleteProfilePicture.mockResolvedValue({})
    
    mockToast.success.mockImplementation(() => {})
    mockToast.error.mockImplementation(() => {})
    
    // Reset FileReader mock
    mockFileReader.onload = null
  })

  it('renders correctly with no current avatar', () => {
    render(<ProfilePictureUpload {...defaultProps} />)
    
    expect(screen.getByText('Profile Picture')).toBeInTheDocument()
    expect(screen.getByText('Upload a new picture or remove the current one')).toBeInTheDocument()
    expect(screen.getByText('Drop your image here, or')).toBeInTheDocument()
    expect(screen.getByText('browse')).toBeInTheDocument()
  })

  it('renders correctly with current avatar', () => {
    render(
      <ProfilePictureUpload 
        {...defaultProps} 
        currentAvatarUrl="https://example.com/avatar.jpg" 
      />
    )
    
    expect(screen.getByAltText('Current profile picture')).toBeInTheDocument()
    expect(screen.getByText('Remove')).toBeInTheDocument()
  })

  it('opens file dialog when browse button is clicked', () => {
    const mockClick = vi.fn()
    const mockFileInput = { click: mockClick }
    
    vi.spyOn(React, 'useRef').mockReturnValueOnce({ current: mockFileInput })
    
    render(<ProfilePictureUpload {...defaultProps} />)
    
    fireEvent.click(screen.getByText('browse'))
    expect(mockClick).toHaveBeenCalled()
  })

  it('handles file selection and shows preview', async () => {
    render(<ProfilePictureUpload {...defaultProps} />)
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(fileInput)
    
    // Simulate FileReader onload
    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,mockbase64' } })
    }
    
    await waitFor(() => {
      expect(screen.getByAltText('Preview')).toBeInTheDocument()
      expect(screen.getByText('test.jpg')).toBeInTheDocument()
      expect(screen.getByText('Upload Picture')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })
  })

  it('validates file before showing preview', () => {
    mockProfilePictureService.validateFile.mockReturnValue({
      isValid: false,
      error: 'File too large',
    })
    
    const onUploadError = vi.fn()
    render(<ProfilePictureUpload {...defaultProps} onUploadError={onUploadError} />)
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(fileInput)
    
    expect(mockProfilePictureService.validateFile).toHaveBeenCalledWith(file)
    expect(onUploadError).toHaveBeenCalledWith('File too large')
    expect(screen.getByText('File too large')).toBeInTheDocument()
    expect(screen.queryByAltText('Preview')).not.toBeInTheDocument()
  })

  it('handles drag and drop', async () => {
    render(<ProfilePictureUpload {...defaultProps} />)
    
    const dropZone = screen.getByText('Drop your image here, or').closest('div')
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    
    // Test drag over
    fireEvent.dragOver(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    })
    
    expect(dropZone).toHaveClass('border-primary-400', 'bg-primary-50')
    
    // Test drag leave
    fireEvent.dragLeave(dropZone!)
    expect(dropZone).not.toHaveClass('border-primary-400', 'bg-primary-50')
    
    // Test drop
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    })
    
    expect(mockProfilePictureService.validateFile).toHaveBeenCalledWith(file)
  })

  it('uploads file successfully', async () => {
    const onUploadSuccess = vi.fn()
    render(<ProfilePictureUpload {...defaultProps} onUploadSuccess={onUploadSuccess} />)
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(fileInput)
    
    // Simulate FileReader onload
    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,mockbase64' } })
    }
    
    await waitFor(() => {
      expect(screen.getByText('Upload Picture')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Upload Picture'))
    
    await waitFor(() => {
      expect(mockProfilePictureService.uploadProfilePicture).toHaveBeenCalledWith(
        file,
        expect.any(Function)
      )
      expect(mockToast.success).toHaveBeenCalledWith('Profile picture updated successfully!')
      expect(onUploadSuccess).toHaveBeenCalledWith('https://example.com/new-avatar.jpg')
    })
  })

  it('shows upload progress', async () => {
    let progressCallback: (progress: any) => void
    
    mockProfilePictureService.uploadProfilePicture.mockImplementation(
      (file: File, onProgress: (progress: any) => void) => {
        progressCallback = onProgress
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ profilePictureUrl: 'https://example.com/new-avatar.jpg' })
          }, 100)
        })
      }
    )
    
    render(<ProfilePictureUpload {...defaultProps} />)
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(fileInput)
    
    // Simulate FileReader onload
    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,mockbase64' } })
    }
    
    await waitFor(() => {
      expect(screen.getByText('Upload Picture')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Upload Picture'))
    
    // Simulate progress update
    progressCallback!({ loaded: 50, total: 100, percentage: 50 })
    
    await waitFor(() => {
      expect(screen.getByText('Uploading... 50%')).toBeInTheDocument()
    })
  })

  it('handles upload error', async () => {
    mockProfilePictureService.uploadProfilePicture.mockRejectedValue(
      new Error('Upload failed')
    )
    
    const onUploadError = vi.fn()
    render(<ProfilePictureUpload {...defaultProps} onUploadError={onUploadError} />)
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(fileInput)
    
    // Simulate FileReader onload
    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,mockbase64' } })
    }
    
    await waitFor(() => {
      expect(screen.getByText('Upload Picture')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Upload Picture'))
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Upload failed')
      expect(onUploadError).toHaveBeenCalledWith('Upload failed')
    })
  })

  it('cancels file selection', async () => {
    render(<ProfilePictureUpload {...defaultProps} />)
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(fileInput)
    
    // Simulate FileReader onload
    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,mockbase64' } })
    }
    
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Cancel'))
    
    expect(screen.queryByAltText('Preview')).not.toBeInTheDocument()
    expect(screen.getByText('Drop your image here, or')).toBeInTheDocument()
  })

  it('deletes current profile picture', async () => {
    const onUploadSuccess = vi.fn()
    render(
      <ProfilePictureUpload 
        {...defaultProps} 
        currentAvatarUrl="https://example.com/avatar.jpg"
        onUploadSuccess={onUploadSuccess}
      />
    )
    
    fireEvent.click(screen.getByText('Remove'))
    
    await waitFor(() => {
      expect(mockProfilePictureService.deleteProfilePicture).toHaveBeenCalled()
      expect(mockToast.success).toHaveBeenCalledWith('Profile picture removed successfully!')
      expect(onUploadSuccess).toHaveBeenCalledWith(null)
    })
  })

  it('handles delete error', async () => {
    mockProfilePictureService.deleteProfilePicture.mockRejectedValue(
      new Error('Delete failed')
    )
    
    const onUploadError = vi.fn()
    render(
      <ProfilePictureUpload 
        {...defaultProps} 
        currentAvatarUrl="https://example.com/avatar.jpg"
        onUploadError={onUploadError}
      />
    )
    
    fireEvent.click(screen.getByText('Remove'))
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Delete failed')
      expect(onUploadError).toHaveBeenCalledWith('Delete failed')
    })
  })

  it('does not delete when user cancels confirmation', () => {
    vi.mocked(window.confirm).mockReturnValue(false)
    
    render(
      <ProfilePictureUpload 
        {...defaultProps} 
        currentAvatarUrl="https://example.com/avatar.jpg"
      />
    )
    
    fireEvent.click(screen.getByText('Remove'))
    
    expect(mockProfilePictureService.deleteProfilePicture).not.toHaveBeenCalled()
  })

  it('applies custom className', () => {
    const { container } = render(
      <ProfilePictureUpload {...defaultProps} className="custom-class" />
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('shows file size in KB', async () => {
    render(<ProfilePictureUpload {...defaultProps} />)
    
    const file = new File(['x'.repeat(2048)], 'test.jpg', { type: 'image/jpeg' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(fileInput)
    
    // Simulate FileReader onload
    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,mockbase64' } })
    }
    
    await waitFor(() => {
      expect(screen.getByText('2 KB')).toBeInTheDocument()
    })
  })
})