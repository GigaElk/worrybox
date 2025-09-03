# Requirements Document

## Introduction

This specification addresses the worry analysis page functionality, specifically how similar worries are displayed and counted. The system needs to show up to 10 similar worries while respecting privacy constraints, and clearly separate the "Me Too" count from the "Similar Worries" count. The goal is to provide users with meaningful insights about their worries while maintaining appropriate privacy boundaries.

## Requirements

### Requirement 1: Similar Worries Display with Privacy Controls (Analysis Page Only)

**User Story:** As a user viewing the worry analysis page, I want to see up to 10 similar worries that respect privacy boundaries, so that I can understand how common my concerns are without seeing private content from other users.

#### Acceptance Criteria

1. WHEN viewing the worry analysis page THEN the system SHALL display up to 10 similar worries found by AI analysis
2. WHEN viewing worry cards (not analysis page) THEN the system SHALL NOT display the list of similar worries, only counts
3. WHEN similar worries are private posts from other users THEN the system SHALL NOT display them in the analysis page list
4. WHEN similar worries are private posts from the current user THEN the system SHALL display them in the analysis page list
5. WHEN similar worries are public posts THEN the system SHALL display them in the analysis page list regardless of the author
6. WHEN displaying similar worries on analysis page THEN the system SHALL show the worry content, category, and similarity percentage
7. IF fewer than 10 similar worries meet privacy criteria THEN the system SHALL display only the available ones
8. WHEN no similar worries meet privacy criteria THEN the system SHALL display "No similar worries found"

### Requirement 2: Separate Me Too and Similar Worries Counts (Numbers Only on Cards)

**User Story:** As a user viewing a worry post card, I want to see both the "Me Too" count and the "Similar Worries" count displayed separately as numbers only, so that I can understand both direct user responses and AI-detected similarities without seeing the actual worry content.

#### Acceptance Criteria

1. WHEN viewing a worry post card THEN the system SHALL display the "Me Too" count as a separate metric (number only)
2. WHEN viewing a worry post card THEN the system SHALL display the "Similar Worries" count as a separate metric (number only)
3. WHEN calculating "Similar Worries" count THEN the system SHALL include both AI-detected similar worries AND "Me Too" responses
4. WHEN displaying "Me Too" count THEN the system SHALL show only direct user "Me Too" interactions
5. WHEN a user clicks "Me Too" THEN the system SHALL increment both the "Me Too" count and the "Similar Worries" count
6. WHEN a user removes "Me Too" THEN the system SHALL decrement both the "Me Too" count and the "Similar Worries" count
7. WHEN displaying counts on cards THEN the system SHALL use clear labels like "X people said 'Me Too'" and "X people have similar worries"
8. WHEN displaying counts on cards THEN the system SHALL NOT show the actual content of similar worries

### Requirement 3: Worry Analysis Page Layout Enhancement (Detailed View)

**User Story:** As a user viewing the worry analysis page (separate from worry cards), I want to see both detailed similar worries list and summary counts in an organized layout, so that I can easily understand the analysis results and see actual similar worry content.

#### Acceptance Criteria

1. WHEN viewing the worry analysis page THEN the system SHALL display the main analysis in a two-column layout
2. WHEN viewing the main analysis section THEN the system SHALL show detailed worry analysis results
3. WHEN viewing the sidebar section THEN the system SHALL show both "Me Too" count and "Similar Worries" count
4. WHEN viewing the sidebar section THEN the system SHALL display the list of up to 10 similar worries with their actual content
5. WHEN similar worries are displayed on analysis page THEN the system SHALL show worry content, similarity percentage, and category
6. WHEN similar worries are from the current user THEN the system SHALL indicate this with appropriate styling or labels
7. IF the user is not authenticated THEN the system SHALL still show public similar worries and counts
8. WHEN viewing worry cards (not analysis page) THEN the system SHALL only show counts, never the similar worries list

### Requirement 4: Privacy and Security Controls

**User Story:** As a user, I want my private worries to remain private from other users while still contributing to similarity analysis, so that I can maintain privacy while helping others understand they're not alone.

#### Acceptance Criteria

1. WHEN analyzing worry similarity THEN the system SHALL include private posts in similarity calculations
2. WHEN displaying similar worries to other users THEN the system SHALL exclude private posts from the visible list
3. WHEN displaying similar worries to the post author THEN the system SHALL include their own private posts
4. WHEN calculating "Similar Worries" count THEN the system SHALL include all similar posts regardless of privacy level
5. WHEN a private post contributes to similarity THEN the system SHALL increment the count without revealing the content
6. IF a user changes a post's privacy level THEN the system SHALL update similar worry displays accordingly
7. WHEN displaying similar worries THEN the system SHALL never expose user identity for private posts

### Requirement 5: Performance and User Experience

**User Story:** As a user, I want the worry analysis page to load quickly and provide clear feedback, so that I can efficiently understand my worry patterns and find relevant support.

#### Acceptance Criteria

1. WHEN loading the worry analysis page THEN the system SHALL display loading states for all data sections
2. WHEN similar worries are being calculated THEN the system SHALL show appropriate loading indicators
3. WHEN API calls fail THEN the system SHALL display user-friendly error messages
4. WHEN similar worries take time to load THEN the system SHALL allow other page sections to load independently
5. IF similar worry calculation fails THEN the system SHALL still display available "Me Too" counts
6. WHEN displaying large numbers of similar worries THEN the system SHALL implement efficient rendering
7. WHEN users interact with similar worries THEN the system SHALL provide immediate visual feedback