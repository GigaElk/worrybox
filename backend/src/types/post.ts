export interface CreatePostRequest {
  shortContent: string;
  worryPrompt: string;
  privacyLevel: 'public' | 'friends' | 'private';
  commentsEnabled?: boolean;
  longContent?: string;
  isScheduled?: boolean;
  scheduledFor?: string; // ISO date string
}

export interface AddBlogContentRequest {
  longContent: string;
}

export interface UpdatePostRequest {
  shortContent?: string;
  longContent?: string;
  privacyLevel?: 'public' | 'friends' | 'private';
  worryPrompt?: string;
  commentsEnabled?: boolean;
}

export interface PostResponse {
  id: string;
  userId: string;
  shortContent: string;
  longContent?: string;
  worryPrompt: string;
  privacyLevel: string;
  commentsEnabled: boolean;
  isScheduled: boolean;
  scheduledFor?: string;
  publishedAt?: string;
  detectedLanguage?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export interface PostsQuery {
  limit?: number;
  offset?: number;
  userId?: string;
  privacyLevel?: 'public' | 'friends' | 'private';
  includeScheduled?: boolean;
}

export interface PostsResponse {
  posts: PostResponse[];
  total: number;
  hasMore: boolean;
}

export interface WorryPromptResponse {
  id: string;
  text: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}