# Design Document

## Overview

This design addresses two distinct display contexts: worry cards (which show only counts) and the worry analysis page (which shows detailed similar worries list). The system separates "Me Too" counts from "Similar Worries" counts, displays up to 10 similar worries on the analysis page while respecting privacy boundaries, and ensures worry cards only show numerical metrics without exposing worry content.

## Architecture

### Component Structure
```
Frontend (React)
├── Pages/
│   └── WorryAnalysisPage (enhanced) - Shows detailed similar worries list
├── Components/
│   ├── PostCard (existing) - Shows only counts, no similar worries list
│   ├── SimilarWorriesList (new) - Only used on analysis page
│   ├── SimilarWorriesCount (enhanced) - Used on both cards and analysis page
│   ├── MeTooCount (new) - Used on both cards and analysis page
│   └── WorryAnalysis (existing)
├── Services/
│   ├── worryAnalysisService (enhanced)
│   └── meTooService (existing)
└── Types/
    └── similarWorries.ts (enhanced)

Backend (Node.js/Express)
├── Routes/
│   └── /api/analysis (enhanced)
├── Services/
│   └── worryAnalysisService (enhanced)
└── Controllers/
    └── worryAnalysisController (enhanced)
```

## Components and Interfaces

### 1. Enhanced Similar Worries API

**API Endpoints**
```typescript
// Enhanced endpoint with privacy filtering
GET /api/analysis/posts/:postId/similar?limit=10&includePrivate=false

interface SimilarWorriesResponse {
  similarWorries: SimilarWorry[];
  totalCount: number; // Total including private ones
  visibleCount: number; // Count of worries shown to user
  hasMore: boolean;
}

interface SimilarWorry {
  id: string;
  shortContent: string;
  category: string;
  subcategory?: string;
  similarity: number; // 0-1 similarity score
  isOwnPost: boolean; // True if belongs to current user
  privacyLevel: 'public' | 'private';
  createdAt: string;
  user?: {
    id: string;
    username: string;
    displayName?: string;
  }; // Only included for public posts or own posts
}
```

### 2. Separate Count Metrics

**API Endpoints**
```typescript
// Separate endpoints for different count types
GET /api/metoo/:postId/count // Direct "Me Too" count
GET /api/analysis/posts/:postId/similar-count // AI + Me Too combined count

interface CountResponse {
  count: number;
  breakdown?: {
    aiSimilar: number;
    meTooResponses: number;
  };
}
```

### 3. Enhanced Frontend Components

**SimilarWorriesList Component**
```typescript
interface SimilarWorriesListProps {
  postId: string;
  limit?: number;
  showPrivate?: boolean; // Based on user authentication
}

interface SimilarWorriesListState {
  worries: SimilarWorry[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  visibleCount: number;
}
```

**Separate Count Components**
```typescript
interface MeTooCountProps {
  postId: string;
  showButton?: boolean;
}

interface SimilarWorriesCountProps {
  postId: string;
  showBreakdown?: boolean;
}
```

### 4. Privacy-Aware Backend Logic

**Privacy Filtering Service**
```typescript
class PrivacyFilterService {
  async filterSimilarWorries(
    worries: SimilarWorry[],
    currentUserId?: string
  ): Promise<SimilarWorry[]> {
    return worries.filter(worry => {
      // Always show public posts
      if (worry.privacyLevel === 'public') return true;
      
      // Show private posts only to the author
      if (worry.privacyLevel === 'private' && worry.userId === currentUserId) {
        return true;
      }
      
      return false;
    });
  }
}
```

## Data Models

### Enhanced Similar Worry Model
```typescript
interface SimilarWorry {
  id: string;
  shortContent: string;
  category: string;
  subcategory?: string;
  similarity: number;
  isOwnPost: boolean;
  privacyLevel: 'public' | 'private';
  createdAt: string;
  user?: {
    id: string;
    username: string;
    displayName?: string;
    profilePictureUrl?: string;
  };
  // Metadata for display
  displayContent: string; // Truncated if needed
  categoryColor?: string;
  similarityLabel: string; // e.g., "85% similar"
}
```

### Count Metrics Model
```typescript
interface WorryMetrics {
  meTooCount: number;
  similarWorriesCount: number; // AI + MeToo combined
  breakdown: {
    aiDetectedSimilar: number;
    meTooResponses: number;
  };
  userHasMeToo: boolean;
}
```

## Error Handling

### Privacy Error Handling
1. **Unauthorized Access**: Return filtered results without errors
2. **Missing Data**: Show appropriate empty states
3. **Privacy Level Changes**: Update displays in real-time
4. **Authentication Changes**: Refresh privacy filtering

### API Error Handling
```typescript
interface SimilarWorriesError {
  code: 'ANALYSIS_NOT_FOUND' | 'PRIVACY_ERROR' | 'CALCULATION_ERROR';
  message: string;
  fallbackData?: {
    meTooCount: number;
    basicSimilarCount: number;
  };
}
```

## Testing Strategy

### Unit Tests
- Privacy filtering logic
- Count calculation accuracy
- Component rendering with different data states
- Error boundary functionality

### Integration Tests
- Similar worries display with privacy controls
- Count updates when Me Too is toggled
- Authentication state changes affecting privacy
- API endpoint responses with different user contexts

### Privacy Tests
- Private posts not visible to other users
- Own private posts visible to author
- Count accuracy with mixed privacy levels
- Real-time updates when privacy changes

## Performance Considerations

### Database Optimization
```sql
-- Indexes for efficient similar worry queries
CREATE INDEX idx_worry_analysis_category ON worry_analysis(category);
CREATE INDEX idx_worry_analysis_similarity ON worry_analysis(post_id, similarity DESC);
CREATE INDEX idx_posts_privacy_user ON posts(privacy_level, user_id);

-- Composite index for privacy-aware queries
CREATE INDEX idx_posts_privacy_category ON posts(privacy_level, category) 
WHERE privacy_level = 'public';
```

### Frontend Performance
- Lazy loading for similar worries list
- Memoized privacy filtering
- Debounced count updates
- Efficient re-rendering with React.memo

### Caching Strategy
- Cache similar worries for 5 minutes
- Invalidate cache on privacy changes
- User-specific cache for private content
- Background refresh for count updates

## Security Considerations

### Privacy Protection
- Server-side privacy filtering (never trust client)
- Audit logs for privacy-sensitive operations
- Rate limiting on analysis endpoints
- Input validation for all parameters

### Data Exposure Prevention
```typescript
// Sanitize responses based on user context
function sanitizeSimilarWorry(
  worry: SimilarWorry, 
  currentUserId?: string
): SimilarWorry {
  if (worry.privacyLevel === 'private' && worry.userId !== currentUserId) {
    // This should never happen due to filtering, but safety check
    throw new Error('Privacy violation prevented');
  }
  
  return {
    ...worry,
    user: worry.privacyLevel === 'public' || worry.userId === currentUserId 
      ? worry.user 
      : undefined
  };
}
```

## Migration Strategy

### Database Changes
1. Add privacy-aware indexes
2. Update similar worry calculation to respect privacy
3. Migrate existing analysis data if needed

### Frontend Changes
1. Split SimilarWorries component into list and count components
2. Add privacy-aware API calls
3. Update WorryAnalysisPage layout
4. Implement separate Me Too and Similar Worries displays

### Backward Compatibility
- Maintain existing API endpoints during transition
- Gradual rollout of new privacy features
- Fallback to old behavior if new features fail

## UI/UX Design

### Worry Analysis Page Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Back to Post                                                │
├─────────────────────────────────────────────────────────────┤
│ Post Summary                                                │
├─────────────────────────────────────────────────────────────┤
│ Main Analysis (2/3 width)    │ Sidebar (1/3 width)         │
│                               │                              │
│ WorryAnalysis Component       │ ┌─────────────────────────┐ │
│ - Category                    │ │ Me Too Count            │ │
│ - Sentiment                   │ │ "5 people said Me Too"  │ │
│ - Keywords                    │ └─────────────────────────┘ │
│ - Confidence                  │                              │
│                               │ ┌─────────────────────────┐ │
│                               │ │ Similar Worries Count   │ │
│                               │ │ "12 people have similar │ │
│                               │ │ worries"                │ │
│                               │ └─────────────────────────┘ │
│                               │                              │
│                               │ ┌─────────────────────────┐ │
│                               │ │ Similar Worries List    │ │
│                               │ │ - Worry 1 (85% similar)│ │
│                               │ │ - Worry 2 (78% similar)│ │
│                               │ │ - ...up to 10 worries   │ │
│                               │ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Similar Worry Item Design
```
┌─────────────────────────────────────────────────────────────┐
│ 🔒 "I'm worried about my job security..." (Your private post)│
│ Health & Wellness • 85% similar • 2 days ago               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ "Concerned about upcoming presentation..."                   │
│ Work & Career • 78% similar • by @username • 1 week ago    │
└─────────────────────────────────────────────────────────────┘
```