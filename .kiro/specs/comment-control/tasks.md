# Implementation Plan

- [x] 1. Update database schema and types


  - Add `commentsEnabled` field to Post model in Prisma schema with default value true
  - Generate and run database migration to add the new column
  - Update backend TypeScript interfaces to include the new field
  - _Requirements: 1.1, 1.2, 5.2_



- [ ] 2. Update backend post creation and retrieval logic
  - Modify post creation endpoint to accept and store `commentsEnabled` parameter
  - Update post update endpoint to handle `commentsEnabled` changes
  - Ensure all post retrieval endpoints include `commentsEnabled` in response data


  - Add validation for `commentsEnabled` parameter in request schemas
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 5.2_

- [x] 3. Implement comment validation logic


  - Add validation in comment creation endpoints to check if comments are enabled on the target post
  - Return appropriate error response when attempting to comment on posts with comments disabled
  - Write unit tests for comment validation logic
  - _Requirements: 5.1, 5.3_



- [ ] 4. Update frontend post interfaces and services
  - Add `commentsEnabled` field to frontend PostResponse, CreatePostRequest, and UpdatePostRequest interfaces
  - Update postService methods to handle the new field in API calls
  - Ensure proper TypeScript typing throughout the frontend codebase



  - _Requirements: 1.1, 2.1, 2.2_

- [x] 5. Add comment control to post creation form


  - Add toggle/checkbox component to post creation form for enabling/disabling comments
  - Set default value to comments enabled (true)
  - Include the setting in form submission data
  - Add appropriate labeling and help text for the comment control option
  - _Requirements: 1.1, 1.2_



- [ ] 6. Add comment control to post editing functionality
  - Add toggle/checkbox component to post edit form showing current comment setting
  - Allow users to change comment settings when editing existing posts


  - Update form submission to include modified comment settings
  - _Requirements: 2.1, 2.2_

- [ ] 7. Update post display components to respect comment settings
  - Modify post display components to check `commentsEnabled` status



  - Hide comment form and reply buttons when comments are disabled
  - Show visual indicator when comments are disabled on a post
  - Display existing comments but prevent new comment creation when comments are disabled
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 8. Implement frontend error handling for disabled comments
  - Handle API errors when attempting to comment on posts with comments disabled
  - Display user-friendly error messages explaining why comments cannot be added
  - Prevent comment form submission on client-side when comments are disabled
  - _Requirements: 3.1, 3.2_

- [ ] 9. Add comprehensive testing for comment control feature
  - Write backend unit tests for post creation/update with comment control
  - Write backend unit tests for comment validation logic
  - Write frontend component tests for comment control UI elements
  - Write integration tests for complete comment control workflows
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3_

- [ ] 10. Ensure consistent behavior across all post types
  - Verify comment control works for both short worries and detailed blog posts
  - Test that comment settings apply to both main post content and associated blog content
  - Ensure UI consistency across different post display contexts (feed, profile, individual post view)
  - _Requirements: 4.1, 4.2, 4.3_