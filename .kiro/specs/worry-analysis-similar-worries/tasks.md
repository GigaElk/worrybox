# Implementation Plan

- [x] 1. Backend API enhancements for privacy-aware similar worries

  - ✅ Enhanced the `/api/analysis/posts/:postId/similar` endpoint with privacy filtering
  - ✅ Added `includePrivate` parameter and user context to filter results appropriately
  - ✅ Updated `SimilarWorry` interface to include `isOwnPost` and `privacyLevel` fields
  - ✅ Implemented server-side privacy filtering logic to never expose private posts to other users
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3_

- [x] 2. Separate count endpoints and logic

  - ✅ Created separate endpoint `/api/metoo/:postId/count` for direct Me Too count
  - ✅ Enhanced `/api/analysis/posts/:postId/similar-count` to return breakdown of AI vs Me Too counts
  - ✅ Updated backend logic to calculate and return separate metrics
  - ✅ Ensured Me Too actions update both individual and combined counts
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 3. Create SimilarWorriesList component (Analysis Page Only)

  - ✅ Built new component to display up to 10 similar worries with privacy controls
  - ✅ Component is ONLY used on the worry analysis page, never on worry cards
  - ✅ Implemented loading states and error handling for the worries list
  - ✅ Added proper styling to distinguish own private posts from public posts
  - ✅ Included similarity percentage and category information for each worry
  - ✅ Handled empty states when no similar worries meet privacy criteria
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 3.4, 3.5, 3.6_

- [x] 4. Create separate MeTooCount component (Numbers Only)

  - ✅ Extracted Me Too count display into its own component for use on both cards and analysis page
  - ✅ Shows only direct "Me Too" interactions count with clear labeling (no content)
  - ✅ Integrated with existing MeTooButton functionality
  - ✅ Provided proper loading and error states
  - ✅ Ensured component never displays actual worry content, only numerical counts
  - _Requirements: 2.1, 2.4, 2.7, 2.8_

- [x] 5. Enhance SimilarWorriesCount component (Numbers Only)

  - ✅ Updated existing component to show combined AI + Me Too count for use on both cards and analysis page
  - ✅ Added optional breakdown display showing AI vs Me Too contributions
  - ✅ Ensured count updates properly when Me Too actions occur
  - ✅ Maintained attractive visual design with clear labeling
  - ✅ Ensured component never displays actual worry content, only numerical counts
  - _Requirements: 2.2, 2.3, 2.7, 2.8_

- [x] 6. Update WorryAnalysisPage layout

  - ✅ Implemented two-column layout with main analysis and sidebar
  - ✅ Integrated new SimilarWorriesList component in sidebar
  - ✅ Added both MeTooCount and SimilarWorriesCount components to sidebar
  - ✅ Ensured responsive design works on different screen sizes
  - ✅ Updated page structure to accommodate new components
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7_

- [x] 7. Implement privacy filtering service

  - ✅ Created frontend service to handle privacy-aware API calls
  - ✅ Added user context to similar worries requests
  - ✅ Implemented proper error handling for privacy-related issues
  - ✅ Cache results appropriately while respecting privacy changes
  - _Requirements: 4.1, 4.2, 4.3, 4.6, 5.3_

- [x] 8. Update worryAnalysisService

  - ✅ Enhanced `findSimilarWorries` method to support privacy parameters
  - ✅ Added new methods for separate count retrieval
  - ✅ Implemented proper error handling and fallback behavior
  - ✅ Added TypeScript interfaces for new response formats
  - _Requirements: 1.1, 2.1, 2.2, 5.1, 5.2_

- [x] 9. Add comprehensive error handling

  - ✅ Implemented graceful degradation when similar worries fail to load
  - ✅ Show appropriate error messages for privacy and API failures
  - ✅ Ensured other page sections load independently if one fails
  - ✅ Added retry logic for transient failures
  - _Requirements: 5.2, 5.3, 5.4, 5.5_

- [ ] 10. Performance optimizations

  - Add database indexes for efficient privacy-aware queries
  - Implement caching strategy for similar worries with privacy considerations
  - Add lazy loading for similar worries list
  - Optimize re-rendering with React.memo and proper dependency arrays
  - _Requirements: 5.1, 5.6_

- [ ] 11. Write comprehensive tests

  - Unit tests for privacy filtering logic
  - Component tests for new SimilarWorriesList and count components
  - Integration tests for the complete worry analysis page flow
  - Privacy tests to ensure private posts are never exposed inappropriately
  - _Requirements: 4.4, 4.5, 4.7_

- [ ] 12. Update existing components integration

  - Ensure MeTooButton properly updates both separate and combined counts
  - Verify PostCard component shows only counts, never similar worries content
  - Ensure SimilarWorriesList component is only used on WorryAnalysisPage, never on cards

  - Verify all existing functionality continues to work with new architecture
  - Test authentication state changes affecting privacy display

  - _Requirements: 1.2, 2.5, 2.6, 2.8, 3.8, 4.6_
