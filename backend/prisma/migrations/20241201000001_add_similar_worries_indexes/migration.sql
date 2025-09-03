-- Add indexes for efficient privacy-aware similar worries queries

-- Index for posts by privacy level and category (for similar worries filtering)
CREATE INDEX IF NOT EXISTS "idx_posts_privacy_category" ON "posts" ("privacy_level", "created_at" DESC);

-- Index for posts by user and privacy level (for own posts filtering)
CREATE INDEX IF NOT EXISTS "idx_posts_user_privacy" ON "posts" ("user_id", "privacy_level", "created_at" DESC);

-- Index for worry analysis by category and sentiment (for AI similarity matching)
CREATE INDEX IF NOT EXISTS "idx_worry_analysis_category_sentiment" ON "worry_analysis" ("category", "sentiment_score" DESC, "created_at" DESC);

-- Index for worry analysis by post and similarity count (for count queries)
CREATE INDEX IF NOT EXISTS "idx_worry_analysis_post_similarity" ON "worry_analysis" ("post_id", "similar_worry_count");

-- Index for MeToo responses by post (for count queries)
CREATE INDEX IF NOT EXISTS "idx_metoo_post_created" ON "me_too" ("post_id", "created_at" DESC);

-- Index for MeToo responses by user and post (for duplicate prevention)
CREATE INDEX IF NOT EXISTS "idx_metoo_user_post" ON "me_too" ("user_id", "post_id");

-- Composite index for posts with all relevant fields for similar worries queries
CREATE INDEX IF NOT EXISTS "idx_posts_similar_worries_composite" ON "posts" ("user_id", "privacy_level", "created_at" DESC) 
WHERE "privacy_level" = 'public' OR "privacy_level" = 'private';

-- Index for full-text search on post content (for similarity matching)
CREATE INDEX IF NOT EXISTS "idx_posts_content_search" ON "posts" USING gin(to_tsvector('english', COALESCE("long_content", '') || ' ' || COALESCE("short_content", '')));

-- Index for worry analysis keywords (for similarity matching)
CREATE INDEX IF NOT EXISTS "idx_worry_analysis_keywords" ON "worry_analysis" USING gin(to_tsvector('english', COALESCE("keywords", '')));

-- Index for efficient pagination in similar worries queries
CREATE INDEX IF NOT EXISTS "idx_posts_pagination" ON "posts" ("id", "created_at" DESC);

-- Statistics update for query planner optimization
ANALYZE "posts";
ANALYZE "worry_analysis";
ANALYZE "me_too";