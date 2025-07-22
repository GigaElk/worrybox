# Requirements Document

## Introduction

This feature allows users to control whether others can comment on their posts. Users can disable comments on individual posts to prevent replies when they want to share their worries without receiving feedback or responses. This gives users more control over their sharing experience and privacy.

## Requirements

### Requirement 1

**User Story:** As a user creating a post, I want to disable comments on my post, so that others cannot reply to my worry when I prefer not to receive feedback.

#### Acceptance Criteria

1. WHEN creating a new post THEN the system SHALL provide an option to disable comments
2. WHEN the user selects "disable comments" THEN the system SHALL save this preference with the post
3. WHEN the user submits a post with comments disabled THEN the system SHALL create the post with commenting functionality turned off

### Requirement 2

**User Story:** As a user editing an existing post, I want to toggle comment settings, so that I can change my mind about allowing comments after posting.

#### Acceptance Criteria

1. WHEN editing an existing post THEN the system SHALL display the current comment setting
2. WHEN the user changes the comment setting THEN the system SHALL update the post's comment configuration
3. WHEN comments are disabled on an existing post with existing comments THEN the system SHALL hide the comment form but preserve existing comments

### Requirement 3

**User Story:** As a user viewing posts, I want to see when comments are disabled, so that I understand why I cannot reply to a post.

#### Acceptance Criteria

1. WHEN viewing a post with comments disabled THEN the system SHALL display a visual indicator that comments are disabled
2. WHEN viewing a post with comments disabled THEN the system SHALL NOT display the comment form or reply button
3. WHEN viewing a post with comments disabled THEN the system SHALL show existing comments but prevent new ones

### Requirement 4

**User Story:** As a user, I want the comment control to work consistently across all post types, so that I have the same level of control whether posting a short worry or a detailed blog post.

#### Acceptance Criteria

1. WHEN creating any type of post (short worry or blog post) THEN the system SHALL provide comment control options
2. WHEN viewing any post type with comments disabled THEN the system SHALL consistently prevent new comments
3. WHEN the post has an associated blog post THEN the comment setting SHALL apply to both the main post and blog content

### Requirement 5

**User Story:** As a user, I want my comment preferences to be respected in the API, so that the system prevents unauthorized comment creation attempts.

#### Acceptance Criteria

1. WHEN an API request attempts to create a comment on a post with comments disabled THEN the system SHALL return an error
2. WHEN retrieving post data via API THEN the system SHALL include the comment enabled/disabled status
3. WHEN the comment setting is changed THEN the system SHALL validate the user has permission to modify the post