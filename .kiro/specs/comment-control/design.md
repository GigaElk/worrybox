# Design Document

## Overview

The comment control feature allows users to disable comments on their posts, giving them control over whether others can reply to their worries. This feature adds a boolean field to posts and implements frontend/backend logic to respect this setting across all comment-related functionality.

## Architecture

### Database Schema Changes

Add a new field to the existing `Post` model in Prisma schema:

```prisma
model Post {
  // ... existing fields
  commentsEnabled  Boolean   @default(true) @map("comments_enabled")
  // ... rest of existing fields
}
```

### API Layer Changes

**Backend Types Update:**
- Add `commentsEnabled` field to `PostResponse` interface
- Add `commentsEnabled` field to `CreatePostRequest` and `UpdatePostRequest` interfaces

**API Endpoints:**
- Modify existing POST `/posts` endpoint to accept `commentsEnabled` parameter
- Modify existing PUT `/posts/:id` endpoint to accept `commentsEnabled` parameter
- Add validation to comment creation endpoints to check if comments are enabled
- Update GET endpoints to include `commentsEnabled` in response

### Frontend Changes

**Service Layer:**
- Update `PostResponse`, `CreatePostRequest`, and `UpdatePostRequest` interfaces
- Modify post service methods to handle the new field

**UI Components:**
- Add toggle/checkbox in post creation form for comment control
- Add toggle/checkbox in post edit form for comment control
- Modify post display components to show comment status and hide comment forms when disabled
- Add visual indicator when comments are disabled

## Components and Interfaces

### Backend Components

**1. Database Migration**
```sql
ALTER TABLE posts ADD COLUMN comments_enabled BOOLEAN DEFAULT true;
```

**2. Updated Type Definitions**
```typescript
export interface CreatePostRequest {
  // ... existing fields
  commentsEnabled?: boolean;
}

export interface UpdatePostRequest {
  // ... existing fields
  commentsEnabled?: boolean;
}

export interface PostResponse {
  // ... existing fields
  commentsEnabled: boolean;
}
```

**3. Post Controller Updates**
- Validate `commentsEnabled` parameter in create/update operations
- Include `commentsEnabled` in database queries and responses

**4. Comment Controller Updates**
- Add validation to check if comments are enabled before allowing comment creation
- Return appropriate error message when attempting to comment on posts with comments disabled

### Frontend Components

**1. Post Form Component**
- Add comment control toggle with clear labeling
- Default to comments enabled for new posts
- Preserve existing setting when editing posts

**2. Post Display Component**
- Show visual indicator when comments are disabled
- Hide comment form and reply buttons when comments are disabled
- Display existing comments but prevent new ones when comments are disabled

**3. Comment Section Component**
- Conditionally render based on `commentsEnabled` status
- Show informative message when comments are disabled

## Data Models

### Updated Post Model

```typescript
interface Post {
  id: string;
  userId: string;
  shortContent: string;
  longContent?: string;
  worryPrompt: string;
  privacyLevel: 'public' | 'friends' | 'private';
  commentsEnabled: boolean; // New field
  isScheduled: boolean;
  scheduledFor?: string;
  publishedAt?: string;
  detectedLanguage?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}
```

### Comment Validation Logic

```typescript
// Before creating a comment, check if comments are enabled
const post = await prisma.post.findUnique({
  where: { id: postId },
  select: { commentsEnabled: true, userId: true }
});

if (!post.commentsEnabled) {
  throw new Error('Comments are disabled for this post');
}
```

## Error Handling

### Backend Error Responses

**Comment Creation on Disabled Post:**
```json
{
  "error": {
    "code": "COMMENTS_DISABLED",
    "message": "Comments are disabled for this post",
    "statusCode": 403
  }
}
```

**Invalid Comment Control Value:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "commentsEnabled must be a boolean value",
    "statusCode": 400
  }
}
```

### Frontend Error Handling

- Display user-friendly messages when comment creation fails due to disabled comments
- Handle API errors gracefully and provide feedback to users
- Prevent comment form submission when comments are disabled (client-side validation)

## Testing Strategy

### Backend Tests

**Unit Tests:**
- Test post creation with `commentsEnabled` set to true/false
- Test post update to toggle comment settings
- Test comment creation validation against posts with comments disabled
- Test API response includes `commentsEnabled` field

**Integration Tests:**
- Test complete flow of creating post with comments disabled
- Test editing existing post to disable comments
- Test attempting to comment on post with comments disabled
- Test that existing comments remain visible when comments are disabled

### Frontend Tests

**Component Tests:**
- Test comment control toggle in post creation form
- Test comment control toggle in post edit form
- Test post display shows correct comment status
- Test comment form is hidden when comments are disabled

**Integration Tests:**
- Test complete user flow of creating post with comments disabled
- Test editing post to toggle comment settings
- Test user experience when viewing posts with comments disabled

### End-to-End Tests

- Test user creates post with comments disabled
- Test user edits post to disable comments
- Test other users cannot comment on posts with comments disabled
- Test visual indicators work correctly across different post types

## Implementation Considerations

### Migration Strategy

1. Add database column with default value `true` to maintain backward compatibility
2. Update backend types and validation
3. Update frontend interfaces and components
4. Deploy backend changes first, then frontend
5. Test thoroughly in staging environment

### Performance Impact

- Minimal database impact (single boolean column)
- No significant API performance changes
- Frontend rendering logic slightly more complex but negligible impact

### User Experience

- Clear visual indicators when comments are disabled
- Intuitive toggle control in post forms
- Helpful messaging explaining why comments cannot be added
- Preserve existing comments when comments are disabled on existing posts

### Security Considerations

- Validate user permissions before allowing comment setting changes
- Ensure only post owners can modify comment settings
- Prevent comment creation attempts through API manipulation
- Maintain existing comment moderation and security measures