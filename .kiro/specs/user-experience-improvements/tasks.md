# Implementation Plan

- [x] 1. Database Schema Updates and Migrations

  - Create database migration files for new tables and columns
  - Add me_too table with proper indexes and constraints
  - Add user_follows table with proper indexes and constraints
  - Add profile_picture_cloudinary_id and profile_picture_updated_at columns to users table
  - Test migrations in development environment
  - _Requirements: 2.2, 3.2, 4.3_

- [x] 2. Backend API - Me Too Functionality

  - [x] 2.1 Create MeToo service class with CRUD operations

    - Implement addMeToo, removeMeToo, and getMeTooCount methods
    - Add validation to prevent duplicate MeToo entries per user/post
    - Include error handling for database operations
    - _Requirements: 2.2, 2.5_

  - [x] 2.2 Create Me Too API endpoints

    - Implement POST /api/metoo/:postId endpoint
    - Implement DELETE /api/metoo/:postId endpoint
    - Implement GET /api/metoo/:postId endpoint and count endpoints
    - Add proper authentication middleware and input validation
    - _Requirements: 2.2, 2.3_

  - [x] 2.3 Integrate Me Too count with AI similarity system

    - Update AI service to include MeToo responses in similar worry calculations
    - Modify post response to include combined similarWorryCount
    - Test integration between MeToo data and AI processing
    - _Requirements: 2.3, 2.4_

- [x] 3. Backend API - User Following System

  - [x] 3.1 Create Follow service class

    - Implement followUser, unfollowUser, getFollowers, getFollowing methods
    - Add validation to prevent self-following
    - Include proper error handling and duplicate prevention
    - _Requirements: 3.2, 3.3, 3.6_

  - [x] 3.2 Create Follow API endpoints

    - Implement POST /api/follows/:userId endpoint
    - Implement DELETE /api/follows/:userId endpoint
    - Implement GET /api/follows/:userId/followers and /api/follows/:userId/following endpoints
    - Add authentication and authorization checks
    - _Requirements: 3.2, 3.3, 3.4_

  - [x] 3.3 Enhance user feed with followed users' posts
    - Modify GET /api/users/me/feed to include posts from followed users
    - Implement efficient query with proper pagination
    - Add sorting by creation date and relevance
    - _Requirements: 3.5_

- [x] 4. Backend API - Profile Picture System (Cloudinary Integration)

  - [x] 4.1 Set up Cloudinary configuration and service

    - Install and configure cloudinary npm package
    - Set up environment variables for Cloudinary credentials
    - Create CloudinaryService class with upload, delete, and URL generation methods
    - Add image validation (format, size) before Cloudinary upload
    - _Requirements: 4.2, 4.3, 4.6_

  - [x] 4.2 Create ProfilePicture service class with Cloudinary integration

    - Implement file upload handling with multer middleware for temporary processing
    - Integrate Cloudinary upload with automatic optimization and resizing
    - Add proper error handling for Cloudinary operations
    - Include cleanup for old Cloudinary images when replacing profile pictures
    - Store both Cloudinary URL and public_id in database
    - _Requirements: 4.2, 4.3, 4.6_

  - [x] 4.3 Create Profile Picture API endpoints

    - Implement POST /api/profile-picture/me with multipart upload to Cloudinary
    - Implement DELETE /api/profile-picture/me endpoint with Cloudinary cleanup
    - Implement GET /api/profile-picture/:userId endpoint returning Cloudinary URLs
    - Add proper authentication and file validation middleware
    - _Requirements: 4.1, 4.7_

- [x] 5. Frontend Services - Create Missing API Services

  - [x] 5.1 Create MeToo frontend service

    - Implement meTooService with addMeToo, removeMeToo, getMeTooCount, and hasMeToo methods
    - Add proper error handling and API integration
    - Include TypeScript interfaces for MeToo responses
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 5.2 Create ProfilePicture frontend service
    - Implement profilePictureService with upload, delete, and get methods
    - Add file validation and progress tracking for uploads
    - Include proper error handling for Cloudinary integration
    - _Requirements: 4.1, 4.2, 4.7_

- [x] 6. Frontend Components - Support System Enhancement

  - [x] 6.1 Update LikeButton component to use support terminology

    - Change button text from "Like" to "Show Support" and "Support Shown"
    - Update hover text and accessibility labels
    - Change heart icon context to support context
    - Maintain existing functionality and state management
    - _Requirements: 1.1, 1.4_

  - [x] 6.2 Update support display throughout application
    - Change all "likes" text to "support" or "people showed support"
    - Update post cards, detail views, and user profiles
    - Ensure consistent terminology across all components
    - _Requirements: 1.3_

- [x] 7. Frontend Components - Me Too Functionality

  - [x] 7.1 Create MeTooButton component

    - Design and implement MeToo button with appropriate styling
    - Add click handlers for adding/removing MeToo responses
    - Include loading states and error handling
    - Show "You also worry about this" when user has responded
    - _Requirements: 2.1, 2.5_

  - [x] 7.2 Integrate MeToo button with PostCard component
    - Add MeToo button to PostCard alongside existing LikeButton
    - Update post state management to include MeToo data
    - Display "X people have similar worries" count
    - Ensure proper spacing and layout with other interaction buttons
    - _Requirements: 2.1, 2.4_

- [x] 8. Frontend Components - User Following System Enhancement

  - [x] 8.1 Enhance user profile pages with follow functionality

    - Add FollowButton to user profile pages (already exists but needs integration)
    - Display follower and following counts using FollowStats component
    - Show follow status for current user
    - Add followers/following lists with navigation using FollowList component
    - _Requirements: 3.1, 3.4_

  - [x] 8.2 Update user feed to show posts from followed users
    - Update user feed to show posts from followed users
    - Add proper loading and pagination for enhanced feed
    - Ensure followed users' posts are properly integrated
    - _Requirements: 3.5_

- [x] 9. Frontend Components - Profile Picture System (Cloudinary Integration)

  - [x] 9.1 Create ProfilePictureUpload component

    - Implement file upload component with drag-and-drop support
    - Add image preview before upload to backend/Cloudinary
    - Include file validation (size, format) with user feedback
    - Add progress indicator for Cloudinary upload process
    - Handle Cloudinary upload responses and error states
    - _Requirements: 4.1, 4.2_

  - [x] 9.2 Create UserAvatar component

    - Design avatar component that displays Cloudinary-hosted profile pictures
    - Implement fallback to user initials when no Cloudinary URL exists
    - Add proper sizing options using Cloudinary transformation URLs
    - Include loading states for Cloudinary image loading
    - Handle Cloudinary image loading errors gracefully
    - _Requirements: 4.4, 4.5_

  - [x] 9.3 Integrate profile pictures throughout application
    - Update PostCard component to use UserAvatar instead of basic avatar display
    - Add UserAvatar component to comments, user lists, and other user interactions
    - Update user profile pages with ProfilePictureUpload component
    - Ensure consistent Cloudinary avatar display across all user interactions
    - _Requirements: 4.5, 4.7_

- [x] 10. Backend API - Enhanced Support System (Like Rebranding)

  - [x] 10.1 Update existing Like endpoints response format

    - Modify like endpoints to return "support" terminology in responses
    - Update response interfaces to use supportCount instead of likeCount
    - Maintain backward compatibility with existing database structure
    - Add userHasShownSupport field to post responses
    - _Requirements: 1.2, 1.3, 1.5_

  - [x] 10.2 Enhance post queries to include all interaction counts
    - Update post retrieval queries to include support, MeToo, and similar worry counts
    - Optimize database queries to fetch all interaction data efficiently
    - Add proper error handling for missing interaction data
    - _Requirements: 1.3, 2.4, 5.5_

- [x] 11. Backend Error Handling and Logging Improvements

  - [x] 11.1 Fix runtime error handling for empty data

    - Update like/support endpoints to handle empty results gracefully
    - Modify post queries to return default values instead of null
    - Add proper null checks in all service methods
    - _Requirements: 5.1, 5.2, 5.5_

  - [x] 11.2 Improve logging configuration and reduce noise
    - Update logging middleware to use appropriate log levels (INFO for 404s)
    - Remove duplicate log entries for request completion
    - Add correlation ID consistency across all log entries
    - Reduce memory warning frequency for stable high usage
    - _Requirements: 6.1, 6.2, 6.5, 6.6_

- [x] 12. Frontend Error Handling and User Experience

  - [x] 12.1 Implement comprehensive error boundaries

    - Create error boundary components for major application sections
    - Add graceful fallbacks for component failures
    - Include user-friendly error messages and recovery options
    - _Requirements: 5.4, 5.6_

  - [x] 12.2 Fix runtime errors and improve data handling
    - Update components to handle empty arrays and null data gracefully
    - Add proper loading states for all data fetching operations
    - Implement retry logic for failed API calls
    - Remove console errors for expected empty states
    - _Requirements: 5.1, 5.4_

- [x] 13. Testing and Quality Assurance

  - [x] 13.1 Write unit tests for new frontend components

    - Test MeTooButton, ProfilePictureUpload, and UserAvatar components
    - Verify proper state management and user interactions
    - Test error handling and loading states
    - _Requirements: All frontend functionality_

  - [x] 13.2 Perform integration testing

    - Test complete workflows: support, MeToo, follow, and profile picture upload

    - Verify API integration and data consistency

    - Test error scenarios and recovery mechanisms
    - _Requirements: All requirements_

- [x] 14. Documentation and Deployment

  - [x] 14.1 Update API documentation

    - Document new endpoints for MeToo, Follow, and ProfilePicture APIs
    - Update existing endpoints documentation for support terminology
    - Include request/response examples and error codes
    - _Requirements: All API changes_

  - [x] 14.2 Create deployment migration plan
    - Prepare database migration scripts for production
    - Create rollback procedures for each change
    - Document deployment steps and verification procedures
    - _Requirements: All database changes_
