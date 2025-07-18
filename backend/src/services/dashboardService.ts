import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DashboardStats {
  totalWorries: number;
  worriesThisWeek: number;
  resolvedWorries: number;
  followersCount: number;
  followingCount: number;
}

export interface RecentWorry {
  id: string;
  shortContent: string;
  worryPrompt: string;
  privacyLevel: string;
  publishedAt: string;
  createdAt: string;
}

export interface DashboardData {
  stats: DashboardStats;
  recentWorries: RecentWorry[];
}

export class DashboardService {
  async getDashboardData(userId: string): Promise<DashboardData> {
    // Get date for "this week" calculation (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Fetch all dashboard data in parallel for better performance
    const [
      totalWorries,
      worriesThisWeek,
      resolvedWorries,
      followersCount,
      followingCount,
      recentWorries
    ] = await Promise.all([
      // Total worries count
      prisma.post.count({
        where: {
          userId,
          publishedAt: { not: null }
        }
      }),

      // Worries this week
      prisma.post.count({
        where: {
          userId,
          publishedAt: { 
            not: null,
            gte: oneWeekAgo
          }
        }
      }),

      // Resolved worries count
      prisma.worryResolution.count({
        where: {
          post: {
            userId
          }
        }
      }),

      // Followers count
      prisma.follow.count({
        where: {
          followingId: userId
        }
      }),

      // Following count
      prisma.follow.count({
        where: {
          followerId: userId
        }
      }),

      // Recent worries (last 5)
      prisma.post.findMany({
        where: {
          userId,
          publishedAt: { not: null }
        },
        select: {
          id: true,
          shortContent: true,
          worryPrompt: true,
          privacyLevel: true,
          publishedAt: true,
          createdAt: true
        },
        orderBy: {
          publishedAt: 'desc'
        },
        take: 5
      })
    ]);

    const stats: DashboardStats = {
      totalWorries,
      worriesThisWeek,
      resolvedWorries,
      followersCount,
      followingCount
    };

    const formattedRecentWorries: RecentWorry[] = recentWorries.map(worry => ({
      id: worry.id,
      shortContent: worry.shortContent,
      worryPrompt: worry.worryPrompt,
      privacyLevel: worry.privacyLevel,
      publishedAt: worry.publishedAt?.toISOString() || '',
      createdAt: worry.createdAt.toISOString()
    }));

    return {
      stats,
      recentWorries: formattedRecentWorries
    };
  }

  async getBasicStats(userId: string): Promise<DashboardStats> {
    const dashboardData = await this.getDashboardData(userId);
    return dashboardData.stats;
  }

  async getRecentWorries(userId: string, limit: number = 5): Promise<RecentWorry[]> {
    const recentWorries = await prisma.post.findMany({
      where: {
        userId,
        publishedAt: { not: null }
      },
      select: {
        id: true,
        shortContent: true,
        worryPrompt: true,
        privacyLevel: true,
        publishedAt: true,
        createdAt: true
      },
      orderBy: {
        publishedAt: 'desc'
      },
      take: limit
    });

    return recentWorries.map(worry => ({
      id: worry.id,
      shortContent: worry.shortContent,
      worryPrompt: worry.worryPrompt,
      privacyLevel: worry.privacyLevel,
      publishedAt: worry.publishedAt?.toISOString() || '',
      createdAt: worry.createdAt.toISOString()
    }));
  }
}