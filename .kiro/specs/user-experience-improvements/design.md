# Design Document

## Overview

This design addresses six key areas of user experience improvements for the Worrybox platform: rebranding likes to "Show Support", implementing "Me Too" functionality, adding user following capabilities, enabling profile picture uploads, fixing runtime errors, and improving logging quality. The design maintains backward compatibility while enhancing the social and supportive nature of the platform.

## Architecture

### Component Structure

```
Frontend (React)
├── Components/
│   ├── SupportButton (replaces LikeButton)
│   ├── MeTooButton (new)
│   ├── FollowButton (new)
│   ├── ProfilePictureUpload (new)
│   └── UserAvatar (enhanced)
├── Services/
│   ├── SupportService (enhanced from LikeService)
│   ├── FollowService (new)
│   └── ProfileService (enhanced)
└── Utils/
    └── ErrorHandling (enhanced)

Backend (Node.js/Express)
├── Routes/
│   ├── /api/support (enhanced from /api/likes)
│   ├── /api/metoo (new)
│   ├── /api/follow (new)
│   └── /api/profile (enhanced)
├── Services/
│   ├── SupportService
│   ├── MeTooService
│   ├── FollowService
│   └── ProfilePictureService
└── Middleware/
    └── ErrorHandling (enhanced)
```

## Components and Interfaces

### 1. Show Support System (Like Enhancement)

**Database Schema (No Changes Required)**

- Existing `likes` table structure remains unchanged
- Backend API endpoints maintain compatibility
- Only frontend terminology changes

**API Endpoints**

```typescript
// Existing endpoints remain the same
POST /api/posts/:postId/likes
DELETE /api/posts/:postId/likes
GET /api/posts/:postId/likes

// Response format enhanced
interface SupportResponse {
  supportCount: number;
  userHasShownSupport: boolean;
  supporters: Array<{
    userId: string;
    username: string;
    supportedAt: string;
  }>;
}
```

### 2. Me Too System

**Database Schema**

```sql
CREATE TABLE me_too (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX idx_me_too_post_id ON me_too(post_id);
CREATE INDEX idx_me_too_user_id ON me_too(user_id);
```

**API Endpoints**

```typescript
POST /api/posts/:postId/metoo
DELETE /api/posts/:postId/metoo
GET /api/posts/:postId/metoo

interface MeTooResponse {
  meTooCount: number;
  userHasMeToo: boolean;
  similarWorryCount: number; // Includes AI-detected + MeToo
}
```

### 3. User Following System

**Database Schema**

```sql
CREATE TABLE user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK(follower_id != following_id)
);

CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);
```

**API Endpoints**

```typescript
POST /api/users/:userId/follow
DELETE /api/users/:userId/follow
GET /api/users/:userId/followers
GET /api/users/:userId/following
GET /api/users/me/feed // Enhanced to include followed users' posts

interface FollowResponse {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}
```

### 4. Profile Picture System

**Database Schema Enhancement**

```sql
ALTER TABLE users ADD COLUMN profile_picture_url VARCHAR(500);
ALTER TABLE users ADD COLUMN profile_picture_updated_at TIMESTAMP;
```

**File Storage Strategy**

- Use local file storage for development
- Prepare for cloud storage (AWS S3/Cloudinary) for production
- Store files in `/uploads/profile-pictures/` directory
- Generate unique filenames to prevent conflicts

**API Endpoints**

```typescript
POST /api/users/me/profile-picture (multipart/form-data)
DELETE /api/users/me/profile-picture
GET /api/users/:userId/profile-picture

interface ProfilePictureResponse {
  profilePictureUrl: string | null;
  updatedAt: string | null;
}
```

### 5. Error Handling Improvements

**Frontend Error Boundaries**

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  errorCode?: string;
}

// Graceful handling for:
// - Empty like/support arrays
// - Missing user data
// - Network failures
// - 404 responses
```

**Backend Error Response Standardization**

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  correlationId: string;
  timestamp: string;
}
```

## Data Models

### Enhanced Post Model

```typescript
interface Post {
  id: string;
  content: string;
  userId: string;
  user: {
    id: string;
    username: string;
    profilePictureUrl?: string;
  };
  supportCount: number; // Renamed from likeCount
  meTooCount: number; // New
  similarWorryCount: number; // AI + MeToo combined
  userHasShownSupport: boolean; // Renamed from userHasLiked
  userHasMeToo: boolean; // New
  createdAt: string;
  updatedAt: string;
}
```

### User Profile Model

```typescript
interface UserProfile {
  id: string;
  username: string;
  email: string;
  profilePictureUrl?: string;
  followerCount: number;
  followingCount: number;
  isFollowing?: boolean; // When viewed by another user
  createdAt: string;
}
```

## Error Handling

### Frontend Error Handling Strategy

1. **Graceful Degradation**: Show default values instead of errors
2. **User Feedback**: Clear messages for user actions
3. **Retry Logic**: Automatic retry for network failures
4. **Loading States**: Proper loading indicators

### Backend Error Handling Strategy

1. **Consistent Error Responses**: Standardized error format
2. **Appropriate HTTP Status Codes**: Correct status for each scenario
3. **Logging Levels**: INFO for expected 404s, WARN for actual issues
4. **Correlation IDs**: Maintain traceability across requests

## Testing Strategy

### Unit Tests

- Component rendering with empty data
- API endpoint responses
- Error boundary functionality
- File upload validation

### Integration Tests

- Support/MeToo workflow end-to-end
- Follow/Unfollow functionality
- Profile picture upload and display
- Error scenarios and recovery

### User Acceptance Tests

- Support button displays correct text
- MeToo count affects similar worries
- Following users shows their posts in feed
- Profile pictures display correctly
- No runtime errors in normal usage

## Performance Considerations

### Database Optimization

- Proper indexing on new tables
- Efficient queries for follower feeds
- Pagination for large datasets

### File Upload Optimization

- Image resizing and compression
- File type validation
- Size limits (e.g., 5MB max)
- Async processing for large uploads

### Frontend Performance

- Lazy loading for profile pictures
- Debounced API calls for rapid clicks
- Optimistic UI updates for better UX

## Security Considerations

### File Upload Security

- Validate file types and sizes
- Sanitize file names
- Scan for malicious content
- Secure file storage permissions

### API Security

- Authentication required for all user actions
- Rate limiting on upload endpoints
- Input validation and sanitization
- CSRF protection for state-changing operations

## Migration Strategy

### Database Migrations

1. Add new tables (me_too, user_follows)
2. Add profile picture columns to users table
3. Create necessary indexes
4. Migrate existing data if needed

### Frontend Migration

1. Update terminology from "Like" to "Show Support"
2. Add new components gradually
3. Maintain backward compatibility during transition
4. Update error handling incrementally

### Deployment Strategy

1. Deploy backend changes first
2. Update frontend components
3. Test thoroughly in staging
4. Gradual rollout to production users
