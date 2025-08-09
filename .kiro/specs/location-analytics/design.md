# Location-Based Analytics Design

## Overview

This design document outlines the technical implementation of location-based analytics for Worrybox. The system uses a privacy-first hybrid approach combining user-controlled location settings with anonymous IP-based inference to provide geographic insights for premium subscribers while maintaining strict privacy protections.

## Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Settings │    │  IP Geolocation  │    │   Analytics     │
│   (Voluntary)   │    │   (Anonymous)    │    │   Dashboard     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │  Geographic Data    │
                    │   Aggregation       │
                    │    Service          │
                    └─────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │   Privacy-Safe      │
                    │   Data Storage      │
                    └─────────────────────┘
```

### Data Flow
1. **User Registration/Settings**: Optional location data collected with explicit consent
2. **Request Processing**: IP addresses temporarily used for geographic inference
3. **Data Aggregation**: Individual data points aggregated into anonymous statistics
4. **Analytics Generation**: Premium users access aggregated geographic insights
5. **Privacy Protection**: Individual identifiers removed, minimum thresholds enforced

## Components and Interfaces

### 1. User Location Management
```typescript
interface UserLocation {
  country?: string;
  region?: string; // State/Province
  city?: string;
  isVoluntary: boolean; // true if user-provided, false if IP-inferred
  privacyLevel: 'full' | 'region_only' | 'country_only' | 'none';
  lastUpdated: Date;
}

interface LocationSettings {
  shareLocation: boolean;
  privacyLevel: 'full' | 'region_only' | 'country_only' | 'none';
  allowAnalytics: boolean;
  allowResearch: boolean;
}
```

### 2. IP Geolocation Service
```typescript
interface IPGeolocation {
  country: string;
  region?: string;
  city?: string;
  accuracy: 'country' | 'region' | 'city';
  confidence: number; // 0-1
}

interface GeolocationService {
  getLocationFromIP(ip: string): Promise<IPGeolocation | null>;
  isValidLocation(location: IPGeolocation): boolean;
  anonymizeLocation(location: IPGeolocation): AnonymousLocation;
}
```

### 3. Geographic Analytics
```typescript
interface GeographicAnalytics {
  region: string;
  country: string;
  timeRange: string;
  totalUsers: number; // Must be >= minimum threshold
  worryCategories: {
    category: string;
    count: number;
    percentage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }[];
  sentimentAnalysis: {
    averageSentiment: number;
    distribution: Record<string, number>;
  };
  topKeywords: string[];
  privacyNote: string;
}

interface AnalyticsQuery {
  regions?: string[];
  countries?: string[];
  timeRange: '30d' | '90d' | '1y';
  categories?: string[];
  minUserThreshold: number; // Default 50
}
```

### 4. Privacy Protection Layer
```typescript
interface PrivacyProtection {
  enforceMinimumThreshold(data: any[], threshold: number): any[];
  anonymizeResults(results: any[]): any[];
  suppressLowVolumeData(data: any[]): any[];
  addPrivacyNotices(results: any): any;
}
```

## Data Models

### Database Schema Updates

#### User Model Extension
```sql
-- Add location fields to users table
ALTER TABLE users ADD COLUMN country VARCHAR(2); -- ISO country code
ALTER TABLE users ADD COLUMN region VARCHAR(100); -- State/Province
ALTER TABLE users ADD COLUMN city VARCHAR(100);
ALTER TABLE users ADD COLUMN location_privacy VARCHAR(20) DEFAULT 'none'; -- 'full', 'region_only', 'country_only', 'none'
ALTER TABLE users ADD COLUMN location_source VARCHAR(20) DEFAULT 'none'; -- 'user', 'ip', 'none'
ALTER TABLE users ADD COLUMN location_updated_at TIMESTAMP;
ALTER TABLE users ADD COLUMN allow_analytics BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN allow_research BOOLEAN DEFAULT false;
```

#### Geographic Analytics Cache
```sql
CREATE TABLE geographic_analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  region VARCHAR(100),
  country VARCHAR(2),
  time_range VARCHAR(10),
  user_count INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  
  -- Ensure minimum privacy thresholds
  CONSTRAINT min_user_threshold CHECK (user_count >= 50)
);

CREATE INDEX idx_geo_cache_key ON geographic_analytics_cache(cache_key);
CREATE INDEX idx_geo_cache_expires ON geographic_analytics_cache(expires_at);
```

#### Anonymous Location Tracking
```sql
-- For IP-based anonymous tracking (no user IDs stored)
CREATE TABLE anonymous_location_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country VARCHAR(2) NOT NULL,
  region VARCHAR(100),
  worry_category VARCHAR(100),
  sentiment_score DECIMAL(3,2),
  created_date DATE NOT NULL, -- Date only, no timestamps
  
  -- No user_id or IP address stored for privacy
  -- Data aggregated daily
);

CREATE INDEX idx_anon_location_date ON anonymous_location_stats(created_date);
CREATE INDEX idx_anon_location_country ON anonymous_location_stats(country);
```

## Implementation Strategy

### Phase 1: User Location Settings
1. **Database Migration**: Add location fields to User model
2. **Settings UI**: Add location section to existing Settings page
3. **Privacy Controls**: Implement granular privacy levels
4. **Validation**: Add location data validation and sanitization

### Phase 2: IP Geolocation Infrastructure
1. **Geolocation Service**: Integrate with IP geolocation API (e.g., MaxMind, IPinfo)
2. **Anonymous Tracking**: Implement privacy-safe IP location inference
3. **Data Aggregation**: Create daily aggregation jobs for anonymous statistics
4. **Privacy Layer**: Implement minimum threshold enforcement

### Phase 3: Analytics Dashboard
1. **Analytics Service**: Create geographic analytics aggregation service
2. **Premium UI**: Build geographic analytics dashboard for premium users
3. **Caching Layer**: Implement analytics caching for performance
4. **Export Features**: Add data export capabilities with privacy protections

### Phase 4: Privacy and Compliance
1. **Privacy Policy**: Update privacy policy with clear data usage disclosure
2. **Consent Management**: Implement granular consent controls
3. **Data Retention**: Implement automatic data purging policies
4. **Audit Trail**: Add logging for privacy-related operations

## Error Handling

### Privacy Protection Failures
- If minimum thresholds not met → Suppress data or aggregate to larger regions
- If geolocation service fails → Gracefully degrade to available data
- If user revokes consent → Immediately stop collection and purge existing data

### Data Quality Issues
- Invalid location data → Validate and sanitize input
- Inconsistent geographic data → Implement data normalization
- Missing location data → Use appropriate fallbacks or indicate unavailable

### Performance Considerations
- Cache aggregated results to avoid repeated calculations
- Use background jobs for heavy analytics processing
- Implement rate limiting for analytics API endpoints
- Optimize database queries with proper indexing

## Security Considerations

### Data Protection
- Encrypt location data at rest
- Use HTTPS for all location-related API calls
- Implement access controls for analytics endpoints
- Regular security audits of location handling code

### Privacy Safeguards
- Never store IP addresses permanently
- Implement data minimization principles
- Regular automated privacy compliance checks
- Clear audit trails for all location data operations

### Compliance Requirements
- GDPR compliance for EU users
- CCPA compliance for California users
- Clear consent mechanisms
- Right to deletion implementation
- Data portability features

## Testing Strategy

### Privacy Testing
- Verify minimum threshold enforcement
- Test data anonymization functions
- Validate consent management flows
- Ensure proper data deletion

### Functionality Testing
- Test location setting updates
- Verify analytics aggregation accuracy
- Test geographic query filtering
- Validate caching mechanisms

### Performance Testing
- Load test analytics endpoints
- Test aggregation job performance
- Verify caching effectiveness
- Monitor database query performance

### Security Testing
- Test access controls
- Verify data encryption
- Test input validation
- Security audit of location handling