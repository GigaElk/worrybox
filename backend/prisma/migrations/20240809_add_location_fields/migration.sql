-- Add location fields to users table
ALTER TABLE [dbo].[users] ADD [country] NVARCHAR(1000);
ALTER TABLE [dbo].[users] ADD [region] NVARCHAR(1000);
ALTER TABLE [dbo].[users] ADD [city] NVARCHAR(1000);
ALTER TABLE [dbo].[users] ADD [location_sharing] BIT NOT NULL DEFAULT 0;

-- Create geographic_analytics table
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
    CONSTRAINT [geographic_analytics_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- Create unique constraint
CREATE UNIQUE NONCLUSTERED INDEX [geographic_analytics_country_region_category_period_periodType_key] ON [dbo].[geographic_analytics]([country] ASC, [region] ASC, [category] ASC, [period] ASC, [periodType] ASC) WHERE [region] IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX [geographic_analytics_country_category_period_periodType_key] ON [dbo].[geographic_analytics]([country] ASC, [category] ASC, [period] ASC, [periodType] ASC) WHERE [region] IS NULL;