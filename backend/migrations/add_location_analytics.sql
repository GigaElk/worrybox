BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [password_hash] NVARCHAR(1000) NOT NULL,
    [username] NVARCHAR(1000) NOT NULL,
    [display_name] NVARCHAR(1000),
    [bio] NVARCHAR(1000),
    [avatar_url] NVARCHAR(1000),
    [email_verified] BIT NOT NULL CONSTRAINT [users_email_verified_df] DEFAULT 0,
    [country] NVARCHAR(1000),
    [region] NVARCHAR(1000),
    [city] NVARCHAR(1000),
    [location_sharing] BIT NOT NULL CONSTRAINT [users_location_sharing_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [users_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email]),
    CONSTRAINT [users_username_key] UNIQUE NONCLUSTERED ([username])
);

-- CreateTable
CREATE TABLE [dbo].[posts] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [short_content] NVARCHAR(1000) NOT NULL,
    [long_content] NVARCHAR(1000),
    [worry_prompt] NVARCHAR(1000) NOT NULL,
    [privacy_level] NVARCHAR(1000) NOT NULL,
    [comments_enabled] BIT NOT NULL CONSTRAINT [posts_comments_enabled_df] DEFAULT 1,
    [is_scheduled] BIT NOT NULL CONSTRAINT [posts_is_scheduled_df] DEFAULT 0,
    [scheduled_for] DATETIME2,
    [published_at] DATETIME2,
    [detected_language] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [posts_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [posts_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[comments] (
    [id] NVARCHAR(1000) NOT NULL,
    [post_id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(1000) NOT NULL,
    [moderation_status] NVARCHAR(1000) NOT NULL CONSTRAINT [comments_moderation_status_df] DEFAULT 'pending',
    [moderation_score] DECIMAL(5,2),
    [parent_comment_id] NVARCHAR(1000),
    [detected_language] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [comments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [comments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[follows] (
    [id] NVARCHAR(1000) NOT NULL,
    [follower_id] NVARCHAR(1000) NOT NULL,
    [following_id] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [follows_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [follows_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [follows_follower_id_following_id_key] UNIQUE NONCLUSTERED ([follower_id],[following_id])
);

-- CreateTable
CREATE TABLE [dbo].[likes] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [post_id] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [likes_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [likes_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [likes_user_id_post_id_key] UNIQUE NONCLUSTERED ([user_id],[post_id])
);

-- CreateTable
CREATE TABLE [dbo].[subscriptions] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [tier] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [lemonsqueezy_id] NVARCHAR(1000),
    [lemonsqueezy_customer_id] NVARCHAR(1000),
    [lemonsqueezy_product_id] NVARCHAR(1000),
    [lemonsqueezy_variant_id] NVARCHAR(1000),
    [paypal_subscription_id] NVARCHAR(1000),
    [paypal_plan_id] NVARCHAR(1000),
    [current_period_start] DATETIME2,
    [current_period_end] DATETIME2,
    [trial_ends_at] DATETIME2,
    [renews_at] DATETIME2,
    [ends_at] DATETIME2,
    [is_usage_based] BIT NOT NULL CONSTRAINT [subscriptions_is_usage_based_df] DEFAULT 0,
    [subscription_item_id] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [subscriptions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [subscriptions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [subscriptions_lemonsqueezy_id_key] UNIQUE NONCLUSTERED ([lemonsqueezy_id]),
    CONSTRAINT [subscriptions_paypal_subscription_id_key] UNIQUE NONCLUSTERED ([paypal_subscription_id])
);

-- CreateTable
CREATE TABLE [dbo].[worry_analysis] (
    [id] NVARCHAR(1000) NOT NULL,
    [post_id] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [subcategory] NVARCHAR(1000),
    [sentiment_score] DECIMAL(5,2),
    [keywords] NVARCHAR(max),
    [similar_worry_count] INT NOT NULL CONSTRAINT [worry_analysis_similar_worry_count_df] DEFAULT 0,
    [analysis_version] NVARCHAR(1000) NOT NULL CONSTRAINT [worry_analysis_analysis_version_df] DEFAULT '1.0',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [worry_analysis_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [worry_analysis_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [worry_analysis_post_id_key] UNIQUE NONCLUSTERED ([post_id])
);

-- CreateTable
CREATE TABLE [dbo].[analytics_cache] (
    [id] NVARCHAR(1000) NOT NULL,
    [cache_key] NVARCHAR(1000) NOT NULL,
    [data] NVARCHAR(max) NOT NULL,
    [expires_at] DATETIME2 NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [analytics_cache_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [analytics_cache_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [analytics_cache_cache_key_key] UNIQUE NONCLUSTERED ([cache_key])
);

-- CreateTable
CREATE TABLE [dbo].[worry_resolutions] (
    [id] NVARCHAR(1000) NOT NULL,
    [post_id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [resolution_story] NVARCHAR(1000),
    [coping_methods] NVARCHAR(max),
    [helpfulness_rating] INT,
    [resolved_at] DATETIME2 NOT NULL CONSTRAINT [worry_resolutions_resolved_at_df] DEFAULT CURRENT_TIMESTAMP,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [worry_resolutions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [worry_resolutions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [worry_resolutions_post_id_key] UNIQUE NONCLUSTERED ([post_id])
);

-- CreateTable
CREATE TABLE [dbo].[guided_exercises] (
    [id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [instructions] NVARCHAR(max) NOT NULL,
    [duration_minutes] INT,
    [difficulty_level] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [guided_exercises_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [guided_exercises_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[user_exercise_completions] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [exercise_id] NVARCHAR(1000) NOT NULL,
    [post_id] NVARCHAR(1000),
    [effectiveness_rating] INT,
    [notes] NVARCHAR(1000),
    [completed_at] DATETIME2 NOT NULL CONSTRAINT [user_exercise_completions_completed_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [user_exercise_completions_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[mental_health_resources] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [phone_number] NVARCHAR(1000),
    [website_url] NVARCHAR(1000),
    [location] NVARCHAR(1000),
    [country_code] NVARCHAR(1000),
    [is_crisis_resource] BIT NOT NULL CONSTRAINT [mental_health_resources_is_crisis_resource_df] DEFAULT 0,
    [is_active] BIT NOT NULL CONSTRAINT [mental_health_resources_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [mental_health_resources_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [mental_health_resources_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[notifications] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [message] NVARCHAR(1000) NOT NULL,
    [is_read] BIT NOT NULL CONSTRAINT [notifications_is_read_df] DEFAULT 0,
    [sent_at] DATETIME2,
    [scheduled_for] DATETIME2,
    [metadata] NVARCHAR(max) NOT NULL CONSTRAINT [notifications_metadata_df] DEFAULT '{}',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [notifications_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [notifications_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[notification_preferences] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [email_notifications] BIT NOT NULL CONSTRAINT [notification_preferences_email_notifications_df] DEFAULT 1,
    [push_notifications] BIT NOT NULL CONSTRAINT [notification_preferences_push_notifications_df] DEFAULT 1,
    [check_in_frequency] NVARCHAR(1000) NOT NULL CONSTRAINT [notification_preferences_check_in_frequency_df] DEFAULT 'weekly',
    [support_notifications] BIT NOT NULL CONSTRAINT [notification_preferences_support_notifications_df] DEFAULT 1,
    [quiet_hours_start] NVARCHAR(1000),
    [quiet_hours_end] NVARCHAR(1000),
    [timezone] NVARCHAR(1000) NOT NULL CONSTRAINT [notification_preferences_timezone_df] DEFAULT 'UTC',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [notification_preferences_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [notification_preferences_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [notification_preferences_user_id_key] UNIQUE NONCLUSTERED ([user_id])
);

-- CreateTable
CREATE TABLE [dbo].[supported_languages] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [native_name] NVARCHAR(1000) NOT NULL,
    [is_active] BIT NOT NULL CONSTRAINT [supported_languages_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [supported_languages_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [supported_languages_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [supported_languages_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[user_language_preferences] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [language_code] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [user_language_preferences_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [user_language_preferences_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [user_language_preferences_user_id_key] UNIQUE NONCLUSTERED ([user_id])
);

-- CreateTable
CREATE TABLE [dbo].[worry_prompts] (
    [id] NVARCHAR(1000) NOT NULL,
    [text] NVARCHAR(1000) NOT NULL,
    [is_active] BIT NOT NULL CONSTRAINT [worry_prompts_is_active_df] DEFAULT 1,
    [sort_order] INT NOT NULL CONSTRAINT [worry_prompts_sort_order_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [worry_prompts_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [worry_prompts_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [worry_prompts_text_key] UNIQUE NONCLUSTERED ([text])
);

-- CreateTable
CREATE TABLE [dbo].[moderation_queue] (
    [id] NVARCHAR(1000) NOT NULL,
    [comment_id] NVARCHAR(1000) NOT NULL,
    [flagged_reasons] NVARCHAR(max),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [moderation_queue_status_df] DEFAULT 'pending',
    [reviewed_by] NVARCHAR(1000),
    [reviewed_at] DATETIME2,
    [review_notes] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [moderation_queue_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [moderation_queue_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [moderation_queue_comment_id_key] UNIQUE NONCLUSTERED ([comment_id])
);

-- CreateTable
CREATE TABLE [dbo].[comment_reports] (
    [id] NVARCHAR(1000) NOT NULL,
    [comment_id] NVARCHAR(1000) NOT NULL,
    [reporter_id] NVARCHAR(1000) NOT NULL,
    [reason] NVARCHAR(1000) NOT NULL,
    [details] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [comment_reports_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [comment_reports_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [comment_reports_comment_id_reporter_id_key] UNIQUE NONCLUSTERED ([comment_id],[reporter_id])
);

-- CreateTable
CREATE TABLE [dbo].[exercises] (
    [id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [duration] INT NOT NULL,
    [difficulty] NVARCHAR(1000) NOT NULL,
    [tags] NVARCHAR(max),
    [imageUrl] NVARCHAR(1000),
    [videoUrl] NVARCHAR(1000),
    [audioUrl] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [exercises_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [exercises_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[exercise_steps] (
    [id] NVARCHAR(1000) NOT NULL,
    [exercise_id] NVARCHAR(1000) NOT NULL,
    [order] INT NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(max) NOT NULL,
    [duration] INT,
    [imageUrl] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [exercise_steps_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [exercise_steps_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[coping_techniques] (
    [id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [instructions] NVARCHAR(max) NOT NULL,
    [whenToUse] NVARCHAR(max),
    [effectiveness] INT NOT NULL,
    [science_based_rating] INT NOT NULL,
    [tags] NVARCHAR(max),
    [imageUrl] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [coping_techniques_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [coping_techniques_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[resources] (
    [id] NVARCHAR(1000) NOT NULL,
    [coping_technique_id] NVARCHAR(1000),
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [url] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [resources_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [resources_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[exercise_progress] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [exercise_id] NVARCHAR(1000) NOT NULL,
    [current_step] INT NOT NULL,
    [completed] BIT NOT NULL CONSTRAINT [exercise_progress_completed_df] DEFAULT 0,
    [started_at] DATETIME2 NOT NULL,
    [completed_at] DATETIME2,
    [notes] NVARCHAR(1000),
    [rating] INT,
    [effectiveness] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [exercise_progress_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [exercise_progress_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ai_reprocessing_queue] (
    [id] NVARCHAR(1000) NOT NULL,
    [content_type] NVARCHAR(1000) NOT NULL,
    [content_id] NVARCHAR(1000),
    [content] NVARCHAR(max) NOT NULL,
    [reason] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [ai_reprocessing_queue_status_df] DEFAULT 'pending',
    [retry_count] INT NOT NULL CONSTRAINT [ai_reprocessing_queue_retry_count_df] DEFAULT 0,
    [last_error] NVARCHAR(1000),
    [result] NVARCHAR(max),
    [processed_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ai_reprocessing_queue_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [ai_reprocessing_queue_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[geographic_analytics] (
    [id] NVARCHAR(1000) NOT NULL,
    [country] NVARCHAR(1000) NOT NULL,
    [region] NVARCHAR(1000),
    [category] NVARCHAR(1000) NOT NULL,
    [subcategory] NVARCHAR(1000),
    [sentiment] DECIMAL(5,2) NOT NULL,
    [count] INT NOT NULL,
    [period] NVARCHAR(1000) NOT NULL,
    [periodType] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [geographic_analytics_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [geographic_analytics_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [geographic_analytics_country_region_category_period_periodType_key] UNIQUE NONCLUSTERED ([country],[region],[category],[period],[periodType])
);

-- AddForeignKey
ALTER TABLE [dbo].[posts] ADD CONSTRAINT [posts_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[comments] ADD CONSTRAINT [comments_post_id_fkey] FOREIGN KEY ([post_id]) REFERENCES [dbo].[posts]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[comments] ADD CONSTRAINT [comments_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[comments] ADD CONSTRAINT [comments_parent_comment_id_fkey] FOREIGN KEY ([parent_comment_id]) REFERENCES [dbo].[comments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[follows] ADD CONSTRAINT [follows_follower_id_fkey] FOREIGN KEY ([follower_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[follows] ADD CONSTRAINT [follows_following_id_fkey] FOREIGN KEY ([following_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[likes] ADD CONSTRAINT [likes_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[likes] ADD CONSTRAINT [likes_post_id_fkey] FOREIGN KEY ([post_id]) REFERENCES [dbo].[posts]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[subscriptions] ADD CONSTRAINT [subscriptions_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[worry_analysis] ADD CONSTRAINT [worry_analysis_post_id_fkey] FOREIGN KEY ([post_id]) REFERENCES [dbo].[posts]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[worry_resolutions] ADD CONSTRAINT [worry_resolutions_post_id_fkey] FOREIGN KEY ([post_id]) REFERENCES [dbo].[posts]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[worry_resolutions] ADD CONSTRAINT [worry_resolutions_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[user_exercise_completions] ADD CONSTRAINT [user_exercise_completions_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[user_exercise_completions] ADD CONSTRAINT [user_exercise_completions_exercise_id_fkey] FOREIGN KEY ([exercise_id]) REFERENCES [dbo].[guided_exercises]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[user_exercise_completions] ADD CONSTRAINT [user_exercise_completions_post_id_fkey] FOREIGN KEY ([post_id]) REFERENCES [dbo].[posts]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[notifications] ADD CONSTRAINT [notifications_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[notification_preferences] ADD CONSTRAINT [notification_preferences_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[user_language_preferences] ADD CONSTRAINT [user_language_preferences_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[user_language_preferences] ADD CONSTRAINT [user_language_preferences_language_code_fkey] FOREIGN KEY ([language_code]) REFERENCES [dbo].[supported_languages]([code]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[moderation_queue] ADD CONSTRAINT [moderation_queue_comment_id_fkey] FOREIGN KEY ([comment_id]) REFERENCES [dbo].[comments]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[comment_reports] ADD CONSTRAINT [comment_reports_comment_id_fkey] FOREIGN KEY ([comment_id]) REFERENCES [dbo].[comments]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[comment_reports] ADD CONSTRAINT [comment_reports_reporter_id_fkey] FOREIGN KEY ([reporter_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[exercise_steps] ADD CONSTRAINT [exercise_steps_exercise_id_fkey] FOREIGN KEY ([exercise_id]) REFERENCES [dbo].[exercises]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[resources] ADD CONSTRAINT [resources_coping_technique_id_fkey] FOREIGN KEY ([coping_technique_id]) REFERENCES [dbo].[coping_techniques]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[exercise_progress] ADD CONSTRAINT [exercise_progress_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[exercise_progress] ADD CONSTRAINT [exercise_progress_exercise_id_fkey] FOREIGN KEY ([exercise_id]) REFERENCES [dbo].[exercises]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

