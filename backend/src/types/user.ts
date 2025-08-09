export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  // Location fields (all optional, user-controlled)
  country?: string;
  region?: string;
  city?: string;
  locationSharing?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  // Location fields (all optional, user-controlled)
  country?: string;
  region?: string;
  city?: string;
  locationSharing?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSearchQuery {
  query?: string;
  limit?: number;
  offset?: number;
}

export interface UserSearchResult {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface UserSearchResponse {
  users: UserSearchResult[];
  total: number;
  hasMore: boolean;
}