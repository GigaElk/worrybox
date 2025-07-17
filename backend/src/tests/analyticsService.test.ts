// Mock the entire Prisma module
const mockPrisma = {
  post: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  worryAnalysis: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
    count: jest.fn(),
  },
}

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}))

import { AnalyticsService } from '../services/analyticsService'

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService

  beforeEach(() => {
    analyticsService = AnalyticsService.getInstance()
    jest.clearAllMocks()
  })

  describe('getPersonalAnalytics', () => {
    const userId = 'user1'
    const mockDate = new Date('2024-01-15T12:00:00Z')

    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(mockDate)
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should get comprehensive personal analytics', async () => {
      // Mock overview data
      mockPrisma.post.count
        .mockResolvedValueOnce(50) // totalWorries
        .mockResolvedValueOnce(10) // worriesInRange
        .mockResolvedValueOnce(3)  // worriesThisWeek
        .mockResolvedValueOnce(8)  // worriesThisMonth

      // Mock category data
      mockPrisma.worryAnalysis.groupBy.mockResolvedValue([
        { category: 'Health & Wellness', _count: { category: 15 } },
        { category: 'Work & Career', _count: { category: 10 } },
        { category: 'Relationships', _count: { category: 8 } }
      ])

      // Mock sentiment data
      mockPrisma.worryAnalysis.findMany.mockResolvedValue([
        { sentimentScore: { toNumber: () => -0.3 }, createdAt: new Date() },
        { sentimentScore: { toNumber: () => 0.1 }, createdAt: new Date() },
        { sentimentScore: { toNumber: () => -0.5 }, createdAt: new Date() }
      ])

      // Mock engagement data
      mockPrisma.post.findMany.mockResolvedValue([
        { 
          longContent: 'Extended content here', 
          shortContent: 'Short worry', 
          privacyLevel: 'public', 
          isScheduled: false 
        },
        { 
          longContent: null, 
          shortContent: 'Another worry', 
          privacyLevel: 'private', 
          isScheduled: true 
        }
      ])

      const analytics = await analyticsService.getPersonalAnalytics(userId, '30d')

      expect(analytics).toHaveProperty('overview')
      expect(analytics).toHaveProperty('trends')
      expect(analytics).toHaveProperty('categories')
      expect(analytics).toHaveProperty('sentiment')
      expect(analytics).toHaveProperty('engagement')
      expect(analytics).toHaveProperty('insights')

      expect(analytics.overview.totalWorries).toBe(50)
      expect(analytics.overview.worriesThisWeek).toBe(3)
      expect(analytics.overview.worriesThisMonth).toBe(8)

      expect(analytics.categories.breakdown).toHaveLength(3)
      expect(analytics.categories.breakdown[0].category).toBe('Health & Wellness')
      expect(analytics.categories.breakdown[0].count).toBe(15)

      expect(analytics.engagement.totalPosts).toBe(2)
      expect(analytics.engagement.postsWithBlogContent).toBe(1)
    })

    it('should handle different time ranges', async () => {
      mockPrisma.post.count.mockResolvedValue(25)
      mockPrisma.worryAnalysis.groupBy.mockResolvedValue([])
      mockPrisma.worryAnalysis.findMany.mockResolvedValue([])
      mockPrisma.post.findMany.mockResolvedValue([])

      const analytics90d = await analyticsService.getPersonalAnalytics(userId, '90d')
      const analytics1y = await analyticsService.getPersonalAnalytics(userId, '1y')

      expect(analytics90d).toHaveProperty('overview')
      expect(analytics1y).toHaveProperty('overview')
    })

    it('should generate insights based on data patterns', async () => {
      // Mock data that would trigger insights
      mockPrisma.post.count
        .mockResolvedValueOnce(100) // totalWorries
        .mockResolvedValueOnce(50)  // worriesInRange (current period)
        .mockResolvedValueOnce(5)   // worriesThisWeek
        .mockResolvedValueOnce(20)  // worriesThisMonth
        .mockResolvedValueOnce(10)  // previousPeriodPosts

      mockPrisma.worryAnalysis.groupBy.mockResolvedValue([])
      mockPrisma.worryAnalysis.findMany.mockResolvedValue([])
      mockPrisma.post.findMany.mockResolvedValue([])

      const analytics = await analyticsService.getPersonalAnalytics(userId, '30d')

      expect(analytics.insights).toBeInstanceOf(Array)
      expect(analytics.insights.length).toBeGreaterThan(0)
      
      // Should have milestone insight for 100+ worries
      const milestoneInsight = analytics.insights.find(i => i.type === 'milestone')
      expect(milestoneInsight).toBeDefined()
      expect(milestoneInsight?.title).toContain('Milestone')
    })
  })

  describe('getWorryFrequencyData', () => {
    const userId = 'user1'

    it('should return daily frequency data', async () => {
      mockPrisma.post.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(3)

      const frequencyData = await analyticsService.getWorryFrequencyData(userId, 4)

      expect(frequencyData).toHaveLength(4)
      expect(frequencyData[0]).toHaveProperty('date')
      expect(frequencyData[0]).toHaveProperty('count')
      expect(frequencyData[0].count).toBe(2)
    })

    it('should handle empty data gracefully', async () => {
      mockPrisma.post.count.mockResolvedValue(0)

      const frequencyData = await analyticsService.getWorryFrequencyData(userId, 7)

      expect(frequencyData).toHaveLength(7)
      expect(frequencyData.every(d => d.count === 0)).toBe(true)
    })
  })

  describe('getCategoryTrendData', () => {
    const userId = 'user1'

    it('should return category trends over time', async () => {
      mockPrisma.worryAnalysis.groupBy.mockResolvedValue([
        { category: 'Health & Wellness', _count: { category: 10 } },
        { category: 'Work & Career', _count: { category: 5 } }
      ])

      mockPrisma.worryAnalysis.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)

      const categoryTrends = await analyticsService.getCategoryTrendData(userId, 14)

      expect(categoryTrends).toHaveLength(2)
      expect(categoryTrends[0].category).toBe('Health & Wellness')
      expect(categoryTrends[0].data).toBeInstanceOf(Array)
      expect(categoryTrends[0].data.length).toBeGreaterThan(0)
    })

    it('should handle no categories gracefully', async () => {
      mockPrisma.worryAnalysis.groupBy.mockResolvedValue([])

      const categoryTrends = await analyticsService.getCategoryTrendData(userId, 7)

      expect(categoryTrends).toHaveLength(0)
    })
  })

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AnalyticsService.getInstance()
      const instance2 = AnalyticsService.getInstance()

      expect(instance1).toBe(instance2)
    })
  })
})