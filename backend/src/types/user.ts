export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  emailVerified: boolean;
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