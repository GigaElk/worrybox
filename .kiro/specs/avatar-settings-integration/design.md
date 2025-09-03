# Design Document

## Overview

This design integrates the existing ProfilePictureUpload component into the main SettingsPage to provide users with an intuitive and accessible way to manage their profile pictures. The solution leverages the existing avatar upload infrastructure while enhancing the user experience by placing this functionality where users naturally expect to find it.

## Architecture

### Component Integration Strategy

```
SettingsPage (Enhanced)
├── Profile Information Section
│   ├── Display Name Input (existing)
│   ├── Bio Textarea (existing)
│   ├── ProfilePictureUpload (new integration)
│   └── Email Input (existing, disabled)
├── Other Settings Sections (unchanged)
│   ├── Notification Settings
│   ├── Privacy Settings
│   ├── Subscription Settings
│   ├── Location Settings
│   └── Language Settings
```

### Existing Components Reused

- **ProfilePictureUpload**: Complete reuse of existing component with all functionality
- **UserAvatar**: Used for displaying current profile picture
- **profilePictureService**: Existing service handles all upload/delete operations

## Components and Interfaces

### Enhanced SettingsPage Component

**State Management Enhancement**

```typescript
interface UserSettings {
  displayName: string
  bio: string
  emailNotifications: boolean
  pushNotifications: boolean
  privacyLevel: string
  language: string
  country?: string
  region?: string
  city?: string
  locationSharing?: boolean
  // New addition for avatar management
  profilePictureUrl?: string | null
}
```

**Profile Picture Section Integration**

```typescript
// New handler for avatar upload success
const handleAvatarUploadSuccess = (avatarUrl: string) => {
  setSettings(prev => ({
    ...prev,
    profilePictureUrl: avatarUrl
  }))
  // Refresh user context to update avatar across app
  refreshUser()
  toast.success('Profile picture updated successfully!')
}

// New handler for avatar removal
const handleAvatarRemove = async () => {
  try {
    await profilePictureService.deleteProfilePicture()
    setSettings(prev => ({
      ...prev,
      profilePictureUrl: null
    }))
    refreshUser()
    toast.success('Profile picture removed successfully!')
  } catch (error) {
    toast.error('Failed to remove profile picture')
  }
}
```

### UI Layout Design

**Profile Information Section Enhancement**

```jsx
{/* Profile Settings - Enhanced */}
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  <div className="flex items-center mb-4">
    <User className="h-5 w-5 text-gray-500 mr-2" />
    <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
  </div>
  
  <div className="space-y-6">
    {/* Profile Picture Section - NEW */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Profile Picture
      </label>
      <div className="flex items-start space-x-4">
        {/* Current Avatar Display */}
        <div className="flex-shrink-0">
          <UserAvatar 
            user={{ 
              username: user.username, 
              profilePictureUrl: settings.profilePictureUrl 
            }} 
            size="lg" 
          />
        </div>
        
        {/* Upload Component */}
        <div className="flex-1">
          <ProfilePictureUpload
            currentAvatarUrl={settings.profilePictureUrl}
            onUploadSuccess={handleAvatarUploadSuccess}
            onUploadError={(error) => toast.error(error)}
            className="w-full"
          />
          
          {/* Remove Button (if avatar exists) */}
          {settings.profilePictureUrl && (
            <button
              onClick={handleAvatarRemove}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Remove profile picture
            </button>
          )}
        </div>
      </div>
    </div>
    
    {/* Existing fields remain unchanged */}
    <div>
      <label htmlFor="displayName">Display Name</label>
      {/* ... existing display name input ... */}
    </div>
    
    {/* ... other existing fields ... */}
  </div>
</div>
```

## Data Models

### Enhanced Settings State

```typescript
interface EnhancedUserSettings extends UserSettings {
  profilePictureUrl?: string | null
}

// Settings initialization includes avatar URL
const initializeSettings = (user: User): EnhancedUserSettings => ({
  displayName: user.displayName || '',
  bio: user.bio || '',
  emailNotifications: user.emailNotifications || false,
  pushNotifications: user.pushNotifications || false,
  privacyLevel: user.privacyLevel || 'public',
  language: user.language || 'en',
  country: user.country || '',
  region: user.region || '',
  city: user.city || '',
  locationSharing: user.locationSharing || false,
  profilePictureUrl: user.profilePictureUrl || null
})
```

## Error Handling

### Avatar Upload Error Handling

```typescript
const handleAvatarUploadError = (error: string) => {
  console.error('Avatar upload failed:', error)
  toast.error(`Failed to upload profile picture: ${error}`)
}

const handleAvatarRemoveError = (error: any) => {
  console.error('Avatar removal failed:', error)
  toast.error('Failed to remove profile picture. Please try again.')
}
```

### State Synchronization Error Handling

- Handle cases where avatar upload succeeds but user context refresh fails
- Provide retry mechanisms for failed operations
- Maintain UI consistency even when backend operations fail

## Testing Strategy

### Component Integration Tests

```typescript
describe('SettingsPage Avatar Integration', () => {
  it('displays ProfilePictureUpload component in profile section', () => {
    // Test component rendering
  })
  
  it('shows current avatar when user has profile picture', () => {
    // Test avatar display
  })
  
  it('handles successful avatar upload', async () => {
    // Test upload success flow
  })
  
  it('handles avatar upload errors gracefully', async () => {
    // Test error handling
  })
  
  it('allows avatar removal when picture exists', async () => {
    // Test removal functionality
  })
  
  it('synchronizes avatar changes with user context', async () => {
    // Test state synchronization
  })
})
```

### User Experience Tests

- Verify avatar appears immediately after upload
- Test drag-and-drop functionality within settings page
- Confirm error messages are clear and actionable
- Validate loading states during upload operations

## Performance Considerations

### Optimizations

- **Component Reuse**: Leverage existing ProfilePictureUpload component to avoid code duplication
- **State Management**: Minimal state additions to existing settings management
- **Image Loading**: Use existing UserAvatar component's optimized image loading
- **Memory Management**: Proper cleanup of file previews and upload states

### Loading Strategy

- Show current avatar immediately from user context
- Display upload progress during file operations
- Provide immediate UI feedback for user actions
- Handle slow network conditions gracefully

## Security Considerations

### Existing Security Maintained

- All existing ProfilePictureUpload security validations remain in place
- File type and size restrictions continue to apply
- Cloudinary integration security is unchanged
- Authentication requirements are maintained

### Additional Considerations

- Ensure settings page authentication before allowing avatar operations
- Validate user permissions for profile picture modifications
- Maintain audit trail for profile picture changes

## Migration Strategy

### Implementation Approach

1. **Phase 1**: Enhance SettingsPage component with avatar section
2. **Phase 2**: Integrate ProfilePictureUpload component
3. **Phase 3**: Add state management for avatar operations
4. **Phase 4**: Test integration and error handling
5. **Phase 5**: Deploy and monitor user adoption

### Backward Compatibility

- EditProfilePage functionality remains completely unchanged
- Existing avatar upload workflows continue to work
- No breaking changes to existing APIs or components
- Users can continue using either settings page or edit profile page

### Rollback Strategy

- Changes are additive only, no existing functionality modified
- Simple component removal can revert to previous state
- No database schema changes required
- No API modifications needed

## User Experience Flow

### Primary User Journey

1. User navigates to Settings page (/settings)
2. User sees Profile Information section with current avatar
3. User clicks on ProfilePictureUpload area or drags image
4. User selects/drops image file
5. System shows preview and upload progress
6. System uploads to Cloudinary and updates database
7. User sees updated avatar immediately
8. System shows success message
9. Avatar updates across entire application

### Alternative Flows

- **No Current Avatar**: User sees default avatar with upload prompt
- **Upload Error**: User sees error message with retry option
- **Remove Avatar**: User can remove existing avatar and revert to default
- **Large File**: System handles resizing and optimization automatically

## Integration Points

### Existing Components Used

- **ProfilePictureUpload**: Complete component reuse
- **UserAvatar**: For displaying current profile picture
- **profilePictureService**: All upload/delete operations
- **AuthContext**: User data and refresh functionality
- **Toast notifications**: Success/error messaging

### State Synchronization

- Settings page state updates immediately on successful upload
- User context refreshes to propagate changes app-wide
- EditProfilePage automatically reflects changes made in settings
- All avatar displays across app update without page refresh

This design provides a seamless integration that enhances user experience while maintaining all existing functionality and security measures.