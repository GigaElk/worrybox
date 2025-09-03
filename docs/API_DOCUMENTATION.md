# API Documentation - User Experience Improvements

This document covers the API endpoints for the User Experience Improvements feature set, including support system enhancements, MeToo functionality, user following system, and profile picture management.

## Table of Contents

1. [Authentication](#authentication)
2. [Support System (Enhanced Like System)](#support-system-enhanced-like-system)
3. [MeToo Functionality](#metoo-functionality)
4. [User Following System](#user-following-system)
5. [Profile Picture Management](#profile-picture-management)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)

## Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Support System (Enhanced Like System)

The support system has been enhanced with improved terminology and functionality.

### Show Support for a Post

**Endpoint:** `POST /api/likes/:postId`

**Description:** Show support for a specific post (previously "like")

**Parameters:**
- `postId` (string, required): The ID of the post to support

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "data": {
    "like": {
      "id": "like_123",
      "userId": "user_456",
      "postId": "post_789",
      "createdAt": "2023-12-01T10:00:00Z"
    }
  },
  "message": "Support shown successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Already showing support
- `404 Not Found`: Post not found
- `401 Unauthorized`: Invalid or missing token

### Remove Support from a Post

**Endpoint:** `DELETE /api/likes/:postId`

**Description:** Remove support from a specific post

**Parameters:**
- `postId` (string, required): The ID of the post to remove support from

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Support removed successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Not currently showing support
- `404 Not Found`: Post not found
- `401 Unauthorized`: Invalid or missing token

### Get Support Count for a Post

**Endpoint:** `GET /api/likes/:postId/count`

**Description:** Get the total number of people showing support for a post

**Parameters:**
- `postId` (string, required): The ID of the post

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 42,
    "postId": "post_789"
  }
}
```

### Check if User Shows Support

**Endpoint:** `GET /api/likes/:postId/user`

**Description:** Check if the current user shows support for a specific post

**Parameters:**
- `postId` (string, required): The ID of the post

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hasShownSupport": true,
    "postId": "post_789"
  }
}
```

## MeToo Functionality

The MeToo system allows users to indicate they have similar worries or experiences.

### Add MeToo Response

**Endpoint:** `POST /api/metoo/:postId`

**Description:** Add a "Me Too" response to indicate similar worries

**Parameters:**
- `postId` (string, required): The ID of the post to respond to

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "data": {
    "meToo": {
      "id": "metoo_123",
      "userId": "user_456",
      "postId": "post_789",
      "createdAt": "2023-12-01T10:00:00Z"
    }
  },
  "message": "MeToo response added successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Already responded with MeToo
- `404 Not Found`: Post not found
- `401 Unauthorized`: Invalid or missing token

### Remove MeToo Response

**Endpoint:** `DELETE /api/metoo/:postId`

**Description:** Remove a "Me Too" response

**Parameters:**
- `postId` (string, required): The ID of the post to remove response from

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "MeToo response removed successfully"
}
```

**Error Responses:**
- `400 Bad Request`: No existing MeToo response
- `404 Not Found`: Post not found
- `401 Unauthorized`: Invalid or missing token

### Get MeToo Count

**Endpoint:** `GET /api/metoo/:postId/count`

**Description:** Get the total number of MeToo responses for a post

**Parameters:**
- `postId` (string, required): The ID of the post

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 15,
    "postId": "post_789"
  }
}
```

### Get Similar Worry Count

**Endpoint:** `GET /api/metoo/:postId/similar-count`

**Description:** Get the total count of people with similar worries (includes MeToo responses and AI-detected similar worries)

**Parameters:**
- `postId` (string, required): The ID of the post

**Response:**
```json
{
  "success": true,
  "data": {
    "similarWorryCount": 23,
    "meTooCount": 15,
    "aiSimilarCount": 8,
    "postId": "post_789"
  }
}
```

### Check User MeToo Status

**Endpoint:** `GET /api/metoo/:postId/user`

**Description:** Check if the current user has responded with MeToo

**Parameters:**
- `postId` (string, required): The ID of the post

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hasMeToo": true,
    "postId": "post_789"
  }
}
```

## User Following System

The following system allows users to follow each other and see followed users' posts in their feed.

### Follow a User

**Endpoint:** `POST /api/follows/:userId`

**Description:** Follow another user

**Parameters:**
- `userId` (string, required): The ID of the user to follow

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "data": {
    "follow": {
      "id": "follow_123",
      "followerId": "user_456",
      "followeeId": "user_789",
      "createdAt": "2023-12-01T10:00:00Z"
    }
  },
  "message": "User followed successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Already following user or trying to follow self
- `404 Not Found`: User not found
- `401 Unauthorized`: Invalid or missing token

### Unfollow a User

**Endpoint:** `DELETE /api/follows/:userId`

**Description:** Unfollow a user

**Parameters:**
- `userId` (string, required): The ID of the user to unfollow

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "User unfollowed successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Not currently following user
- `404 Not Found`: User not found
- `401 Unauthorized`: Invalid or missing token

### Get User's Followers

**Endpoint:** `GET /api/follows/:userId/followers`

**Description:** Get a list of users following the specified user

**Parameters:**
- `userId` (string, required): The ID of the user
- `limit` (number, optional): Number of results per page (default: 20, max: 100)
- `offset` (number, optional): Number of results to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "followers": [
      {
        "id": "user_123",
        "username": "follower1",
        "displayName": "Follower One",
        "avatarUrl": "https://example.com/avatar1.jpg",
        "followedAt": "2023-12-01T10:00:00Z"
      }
    ],
    "total": 50,
    "hasMore": true
  }
}
```

### Get Users Followed by User

**Endpoint:** `GET /api/follows/:userId/following`

**Description:** Get a list of users that the specified user is following

**Parameters:**
- `userId` (string, required): The ID of the user
- `limit` (number, optional): Number of results per page (default: 20, max: 100)
- `offset` (number, optional): Number of results to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "following": [
      {
        "id": "user_456",
        "username": "followed1",
        "displayName": "Followed One",
        "avatarUrl": "https://example.com/avatar2.jpg",
        "followedAt": "2023-12-01T09:00:00Z"
      }
    ],
    "total": 25,
    "hasMore": false
  }
}
```

### Get Follow Statistics

**Endpoint:** `GET /api/follows/:userId/stats`

**Description:** Get follower and following counts for a user

**Parameters:**
- `userId` (string, required): The ID of the user

**Response:**
```json
{
  "success": true,
  "data": {
    "followersCount": 50,
    "followingCount": 25,
    "userId": "user_789"
  }
}
```

### Check Follow Status

**Endpoint:** `GET /api/follows/:userId/status`

**Description:** Check if the current user is following the specified user

**Parameters:**
- `userId` (string, required): The ID of the user to check

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isFollowing": true,
    "userId": "user_789"
  }
}
```

## Profile Picture Management

Profile picture management with Cloudinary integration for optimized image handling.

### Upload Profile Picture

**Endpoint:** `POST /api/profile-picture/upload`

**Description:** Upload a new profile picture

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Body:**
- `profilePicture` (file, required): Image file (PNG, JPG, WebP, max 5MB)

**Response:**
```json
{
  "success": true,
  "data": {
    "profilePictureUrl": "https://res.cloudinary.com/example/image/upload/v123456/profile_pictures/user_789.jpg",
    "cloudinaryPublicId": "profile_pictures/user_789",
    "optimizedUrls": {
      "thumbnail": "https://res.cloudinary.com/example/image/upload/c_fill,w_150,h_150/v123456/profile_pictures/user_789.jpg",
      "medium": "https://res.cloudinary.com/example/image/upload/c_fill,w_300,h_300/v123456/profile_pictures/user_789.jpg"
    }
  },
  "message": "Profile picture uploaded successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid file type, size too large, or validation error
- `401 Unauthorized`: Invalid or missing token
- `500 Internal Server Error`: Upload service error

### Delete Profile Picture

**Endpoint:** `DELETE /api/profile-picture`

**Description:** Remove the current user's profile picture

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile picture removed successfully"
}
```

**Error Responses:**
- `404 Not Found`: No profile picture to delete
- `401 Unauthorized`: Invalid or missing token

### Get Profile Picture

**Endpoint:** `GET /api/profile-picture/:userId`

**Description:** Get profile picture information for a user

**Parameters:**
- `userId` (string, required): The ID of the user

**Response:**
```json
{
  "success": true,
  "data": {
    "profilePictureUrl": "https://res.cloudinary.com/example/image/upload/v123456/profile_pictures/user_789.jpg",
    "optimizedUrls": {
      "thumbnail": "https://res.cloudinary.com/example/image/upload/c_fill,w_150,h_150/v123456/profile_pictures/user_789.jpg",
      "medium": "https://res.cloudinary.com/example/image/upload/c_fill,w_300,h_300/v123456/profile_pictures/user_789.jpg",
      "large": "https://res.cloudinary.com/example/image/upload/c_fill,w_600,h_600/v123456/profile_pictures/user_789.jpg"
    },
    "updatedAt": "2023-12-01T10:00:00Z"
  }
}
```

**Error Responses:**
- `404 Not Found`: User not found or no profile picture

## Error Handling

All API endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error details (optional)"
  },
  "correlationId": "req_123456789"
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Requested resource not found
- `UNAUTHORIZED`: Authentication required or invalid
- `FORBIDDEN`: Access denied
- `ALREADY_EXISTS`: Resource already exists (e.g., already following)
- `NOT_EXISTS`: Resource doesn't exist (e.g., not following)
- `RATE_LIMITED`: Too many requests
- `INTERNAL_SERVER_ERROR`: Server error
- `SERVICE_UNAVAILABLE`: External service unavailable

### HTTP Status Codes

- `200 OK`: Successful GET, PUT, DELETE
- `201 Created`: Successful POST
- `400 Bad Request`: Client error, validation failed
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **General endpoints**: 100 requests per minute per user
- **Upload endpoints**: 10 requests per minute per user
- **Follow/Unfollow**: 20 requests per minute per user

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1701432000
```

When rate limit is exceeded:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Please try again later.",
    "details": "Limit: 100 requests per minute"
  },
  "retryAfter": 60
}
```

## Enhanced Post Responses

Posts now include additional fields for the new functionality:

```json
{
  "id": "post_789",
  "shortContent": "Worried about my presentation tomorrow...",
  "fullContent": "I have a big presentation at work tomorrow and I'm really nervous...",
  "userId": "user_456",
  "isAnonymous": false,
  "createdAt": "2023-12-01T10:00:00Z",
  "updatedAt": "2023-12-01T10:00:00Z",
  "user": {
    "id": "user_456",
    "username": "worrier123",
    "displayName": "John Doe",
    "avatarUrl": "https://example.com/avatar.jpg"
  },
  "supportCount": 15,
  "meTooCount": 8,
  "similarWorryCount": 12,
  "userHasShownSupport": true,
  "userHasMeToo": false,
  "commentCount": 3
}
```

## Changelog

### Version 2.1.0 - User Experience Improvements

**New Endpoints:**
- MeToo functionality (`/api/metoo/*`)
- User following system (`/api/follows/*`)
- Profile picture management (`/api/profile-picture/*`)

**Enhanced Endpoints:**
- Support system terminology updates (`/api/likes/*`)
- Enhanced post responses with new interaction counts

**Breaking Changes:**
- Like endpoints now return "support" terminology in responses
- Post objects include new fields: `supportCount`, `meTooCount`, `similarWorryCount`

**Migration Notes:**
- Frontend applications should update to use new terminology
- Database migrations required for new tables: `me_too`, `user_follows`
- Cloudinary configuration required for profile picture uploads