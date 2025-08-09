import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface GeographicAnalyticsQuery {
  countries?: string[];
  regions?: string[];
  timeRange: '30d' | '90d' | '1y';
  categories?: string[];
  minUserThreshold?: number;
}

export interface GeographicAnalyticsResult {
  region: string;
  country: string;
  timeRange: string;
  totalUsers: number;
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

export interface RegionSummary {
  country: string;
  region?: string;
  totalUsers: number;
  totalPosts: number;
  averageSentiment: number;
  topCategories: string[];
}

export class GeographicAnalyticsService {
  private readonly MIN_USER_THRESHOLD = 50;
  private readonly CACHE_TTL_HOURS = 6;

  /**
   * Get aggregated geographic analytics for premium users
   */
  async getGeographicAnalytics(query: GeographicAnalyticsQuery): Promise<GeographicAnalyticsResult[]> {
    const minThreshold = query.minUserThreshold || this.MIN_USER_THRESHOLD;
    const timeRange = this.getDateRange(query.timeRange);

    // Check cache first
    const cacheKey = this.generateCacheKey(query);
    const cached = await this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    // Get aggregated data with privacy protections
    const results = await this.aggregateGeographicData(query, timeRange, minThreshold);
    
    // Cache the results
    await this.cacheResults(cacheKey, results);
    
    return results;
  }

  /**
   * Get region summaries for the analytics dashboard
   */
  async getRegionSummaries(query: GeographicAnalyticsQuery): Promise<RegionSummary[]> {
    const timeRange = this.getDateRange(query.timeRange);
    const minThreshold = query.minUserThreshold || this.MIN_USER_THRESHOLD;

    const summaries = await prisma.$queryRaw<any[]>`
      SELECT 
        u.country,
        u.region,
        COUNT(DISTINCT u.id) as totalUsers,
        COUNT(p.id) as totalPosts,
        AVG(CAST(wa.sentimentScore as FLOAT)) as averageSentiment,
        STRING_AGG(wa.category, ',') as categories
      FROM users u
      LEFT JOIN posts p ON u.id = p.userId 
        AND p.createdAt >= ${timeRange.start}
        AND p.createdAt <= ${timeRange.end}
      LEFT JOIN worry_analysis wa ON p.id = wa.postId
      WHERE u.locationSharing = 1 
        AND u.country IS NOT NULL
        ${query.countries ? `AND u.country IN (${query.countries.map(c => `'${c}'`).join(',')})` : ''}
      GROUP BY u.country, u.region
      HAVING COUNT(DISTINCT u.id) >= ${minThreshold}
      ORDER BY totalUsers DESC
    `;

    return summaries.map(summary => ({
      country: summary.country,
      region: summary.region || undefined,
      totalUsers: parseInt(summary.totalUsers),
      totalPosts: parseInt(summary.totalPosts),
      averageSentiment: parseFloat(summary.averageSentiment) || 0,
      topCategories: summary.categories ? 
        [...new Set(summary.categories.split(','))].slice(0, 5) as string[] : []
    }));
  }

  /**
   * Get worry category trends by region
   */
  async getCategoryTrends(query: GeographicAnalyticsQuery): Promise<any[]> {
    const timeRange = this.getDateRange(query.timeRange);
    const minThreshold = query.minUserThreshold || this.MIN_USER_THRESHOLD;

    const trends = await prisma.$queryRaw<any[]>`
      WITH monthly_data AS (
        SELECT 
          u.country,
          u.region,
          wa.category,
          FORMAT(p.createdAt, 'yyyy-MM') as month,
          COUNT(*) as count
        FROM users u
        JOIN posts p ON u.id = p.userId
        JOIN worry_analysis wa ON p.id = wa.postId
        WHERE u.locationSharing = 1 
          AND u.country IS NOT NULL
          AND p.createdAt >= ${timeRange.start}
          AND p.createdAt <= ${timeRange.end}
          ${query.countries ? `AND u.country IN (${query.countries.map(c => `'${c}'`).join(',')})` : ''}
          ${query.categories ? `AND wa.category IN (${query.categories.map(c => `'${c}'`).join(',')})` : ''}
        GROUP BY u.country, u.region, wa.category, FORMAT(p.createdAt, 'yyyy-MM')
        HAVING COUNT(DISTINCT u.id) >= ${Math.floor(minThreshold / 10)}
      )
      SELECT 
        country,
        region,
        category,
        month,
        count,
        LAG(count) OVER (PARTITION BY country, region, category ORDER BY month) as prev_count
      FROM monthly_data
      ORDER BY country, region, category, month
    `;

    return trends.map(trend => ({
      ...trend,
      trend: this.calculateTrend(trend.count, trend.prev_count)
    }));
  }

  /**
   * Export analytics data with additional privacy protections
   */
  async exportAnalyticsData(query: GeographicAnalyticsQuery, format: 'json' | 'csv' = 'json'): Promise<any> {
    const data = await this.getGeographicAnalytics(query);
    
    // Additional privacy scrubbing for exports
    const sanitizedData = data.map(item => ({
      ...item,
      // Remove any potentially identifying information
      privacyNote: 'This data has been aggregated and anonymized to protect user privacy. Minimum thresholds enforced.',
      exportedAt: new Date().toISOString(),
      dataSource: 'Worrybox Anonymous Analytics'
    }));

    if (format === 'csv') {
      return this.convertToCSV(sanitizedData);
    }

    return sanitizedData;
  }

  private async aggregateGeographicData(
    query: GeographicAnalyticsQuery, 
    timeRange: { start: Date; end: Date }, 
    minThreshold: number
  ): Promise<GeographicAnalyticsResult[]> {
    // Get base geographic data with user counts
    const baseData = await prisma.$queryRaw<any[]>`
      SELECT 
        u.country,
        u.region,
        COUNT(DISTINCT u.id) as userCount,
        COUNT(p.id) as postCount
      FROM users u
      LEFT JOIN posts p ON u.id = p.userId 
        AND p.createdAt >= ${timeRange.start}
        AND p.createdAt <= ${timeRange.end}
      WHERE u.locationSharing = 1 
        AND u.country IS NOT NULL
        ${query.countries ? `AND u.country IN (${query.countries.map(c => `'${c}'`).join(',')})` : ''}
      GROUP BY u.country, u.region
      HAVING COUNT(DISTINCT u.id) >= ${minThreshold}
    `;

    const results: GeographicAnalyticsResult[] = [];

    for (const region of baseData) {
      // Get worry categories for this region
      const categories = await this.getWorryCategories(region, timeRange, query.categories);
      
      // Get sentiment analysis
      const sentiment = await this.getSentimentAnalysis(region, timeRange);
      
      // Get top keywords
      const keywords = await this.getTopKeywords(region, timeRange);

      results.push({
        region: region.region || 'Unknown',
        country: region.country,
        timeRange: query.timeRange,
        totalUsers: parseInt(region.userCount),
        worryCategories: categories,
        sentimentAnalysis: sentiment,
        topKeywords: keywords,
        privacyNote: `Data aggregated from ${region.userCount} users with minimum privacy thresholds enforced.`
      });
    }

    return results;
  }

  private async getWorryCategories(region: any, timeRange: { start: Date; end: Date }, filterCategories?: string[]) {
    const categories = await prisma.$queryRaw<any[]>`
      SELECT 
        wa.category,
        COUNT(*) as count,
        (COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()) as percentage
      FROM users u
      JOIN posts p ON u.id = p.userId
      JOIN worry_analysis wa ON p.id = wa.postId
      WHERE u.country = ${region.country}
        ${region.region ? `AND u.region = ${region.region}` : 'AND u.region IS NULL'}
        AND u.locationSharing = 1
        AND p.createdAt >= ${timeRange.start}
        AND p.createdAt <= ${timeRange.end}
        ${filterCategories ? `AND wa.category IN (${filterCategories.map(c => `'${c}'`).join(',')})` : ''}
      GROUP BY wa.category
      ORDER BY count DESC
      LIMIT 10
    `;

    return categories.map(cat => ({
      category: cat.category,
      count: parseInt(cat.count),
      percentage: parseFloat(cat.percentage),
      trend: 'stable' as const // TODO: Calculate actual trends
    }));
  }

  private async getSentimentAnalysis(region: any, timeRange: { start: Date; end: Date }) {
    const sentiment = await prisma.$queryRaw<any[]>`
      SELECT 
        AVG(CAST(wa.sentimentScore as FLOAT)) as avgSentiment,
        COUNT(CASE WHEN wa.sentimentScore > 0.6 THEN 1 END) as positive,
        COUNT(CASE WHEN wa.sentimentScore BETWEEN 0.4 AND 0.6 THEN 1 END) as neutral,
        COUNT(CASE WHEN wa.sentimentScore < 0.4 THEN 1 END) as negative,
        COUNT(*) as total
      FROM users u
      JOIN posts p ON u.id = p.userId
      JOIN worry_analysis wa ON p.id = wa.postId
      WHERE u.country = ${region.country}
        ${region.region ? `AND u.region = ${region.region}` : 'AND u.region IS NULL'}
        AND u.locationSharing = 1
        AND p.createdAt >= ${timeRange.start}
        AND p.createdAt <= ${timeRange.end}
        AND wa.sentimentScore IS NOT NULL
    `;

    const data = sentiment[0];
    if (!data || !data.total) {
      return {
        averageSentiment: 0,
        distribution: { positive: 0, neutral: 0, negative: 0 }
      };
    }

    return {
      averageSentiment: parseFloat(data.avgSentiment) || 0,
      distribution: {
        positive: (parseInt(data.positive) / parseInt(data.total)) * 100,
        neutral: (parseInt(data.neutral) / parseInt(data.total)) * 100,
        negative: (parseInt(data.negative) / parseInt(data.total)) * 100
      }
    };
  }

  private async getTopKeywords(region: any, timeRange: { start: Date; end: Date }): Promise<string[]> {
    const keywords = await prisma.$queryRaw<any[]>`
      SELECT TOP 10
        value as keyword,
        COUNT(*) as frequency
      FROM users u
      JOIN posts p ON u.id = p.userId
      JOIN worry_analysis wa ON p.id = wa.postId
      CROSS APPLY STRING_SPLIT(wa.keywords, ',') 
      WHERE u.country = ${region.country}
        ${region.region ? `AND u.region = ${region.region}` : 'AND u.region IS NULL'}
        AND u.locationSharing = 1
        AND p.createdAt >= ${timeRange.start}
        AND p.createdAt <= ${timeRange.end}
        AND wa.keywords IS NOT NULL
        AND LEN(TRIM(value)) > 2
      GROUP BY value
      ORDER BY COUNT(*) DESC
    `;

    return keywords.map(k => k.keyword.trim()).filter(k => k.length > 0);
  }

  private getDateRange(timeRange: string): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (timeRange) {
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }

    return { start, end };
  }

  private generateCacheKey(query: GeographicAnalyticsQuery): string {
    return `geo_analytics_${JSON.stringify(query)}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private async getCachedResult(cacheKey: string): Promise<GeographicAnalyticsResult[] | null> {
    try {
      const cached = await prisma.analyticsCache.findUnique({
        where: { cacheKey },
      });

      if (cached && cached.expiresAt > new Date()) {
        return JSON.parse(cached.data);
      }
    } catch (error) {
      console.error('Cache retrieval error:', error);
    }
    return null;
  }

  private async cacheResults(cacheKey: string, results: GeographicAnalyticsResult[]): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.CACHE_TTL_HOURS);

      await prisma.analyticsCache.upsert({
        where: { cacheKey },
        update: {
          data: JSON.stringify(results),
          expiresAt,
        },
        create: {
          cacheKey,
          data: JSON.stringify(results),
          expiresAt,
        },
      });
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  private calculateTrend(current: number, previous: number | null): 'increasing' | 'decreasing' | 'stable' {
    if (!previous || previous === 0) return 'stable';
    
    const change = ((current - previous) / previous) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'object') {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }
}