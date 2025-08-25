import { PlatformAdapterService } from '../services/platformAdapter';
import { RenderOptimizationService } from '../services/renderOptimizations';

describe('Platform Adapter Service', () => {
  let platformAdapter: PlatformAdapterService;
  let renderOptimization: RenderOptimizationService;

  beforeEach(() => {
    platformAdapter = PlatformAdapterService.getInstance();
    renderOptimization = RenderOptimizationService.getInstance();
  });

  describe('Platform Detection', () => {
    it('should detect platform correctly', () => {
      const platform = platformAdapter.detectPlatform();
      expect(['render', 'heroku', 'vercel', 'aws', 'azure', 'gcp', 'local', 'other']).toContain(platform);
    });

    it('should detect Render.com when RENDER env var is set', () => {
      const originalRender = process.env.RENDER;
      process.env.RENDER = 'true';
      
      const newAdapter = new (PlatformAdapterService as any)();
      const platform = newAdapter.detectPlatform();
      
      expect(platform).toBe('render');
      
      // Restore original env
      if (originalRender) {
        process.env.RENDER = originalRender;
      } else {
        delete process.env.RENDER;
      }
    });

    it('should detect local development environment', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const newAdapter = new (PlatformAdapterService as any)();
      const platform = newAdapter.detectPlatform();
      
      expect(platform).toBe('local');
      
      // Restore original env
      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('Configuration', () => {
    it('should return platform configuration', () => {
      const config = platformAdapter.getConfig();
      
      expect(config).toHaveProperty('platform');
      expect(config).toHaveProperty('memoryLimit');
      expect(config).toHaveProperty('maxConnections');
      expect(config).toHaveProperty('requestTimeout');
      expect(config).toHaveProperty('enableOptimizations');
      expect(typeof config.memoryLimit).toBe('number');
      expect(config.memoryLimit).toBeGreaterThan(0);
    });

    it('should provide Render-specific configuration', () => {
      const config = platformAdapter.getOptimalConfiguration();
      
      if (platformAdapter.getPlatform() === 'render') {
        expect(config.memoryLimit).toBe(512); // Render free tier
        expect(config.coldStartOptimization).toBe(true);
        expect(config.lazyLoading).toBe(true);
      }
    });

    it('should provide local development configuration', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const newAdapter = new (PlatformAdapterService as any)();
      const config = newAdapter.getOptimalConfiguration();
      
      expect(config.memoryLimit).toBeGreaterThan(512); // More generous for local
      expect(config.enableOptimizations).toBe(false); // Disabled for easier debugging
      
      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('Resource Monitoring', () => {
    it('should monitor resource limits', () => {
      const limits = platformAdapter.monitorResourceLimits();
      
      expect(limits).toHaveProperty('memory');
      expect(limits).toHaveProperty('cpu');
      expect(limits).toHaveProperty('network');
      
      expect(limits.memory).toHaveProperty('total');
      expect(limits.memory).toHaveProperty('used');
      expect(limits.memory).toHaveProperty('percentage');
      expect(limits.memory).toHaveProperty('approaching');
      expect(limits.memory).toHaveProperty('critical');
      
      expect(typeof limits.memory.total).toBe('number');
      expect(typeof limits.memory.used).toBe('number');
      expect(typeof limits.memory.percentage).toBe('number');
      expect(typeof limits.memory.approaching).toBe('boolean');
      expect(typeof limits.memory.critical).toBe('boolean');
    });

    it('should detect memory pressure correctly', () => {
      const limits = platformAdapter.monitorResourceLimits();
      
      if (limits.memory.percentage > 80) {
        expect(limits.memory.approaching).toBe(true);
      }
      
      if (limits.memory.percentage > 95) {
        expect(limits.memory.critical).toBe(true);
      }
    });
  });

  describe('Platform Features', () => {
    it('should return platform features', () => {
      const features = platformAdapter.getPlatformFeatures();
      
      expect(features).toHaveProperty('autoScaling');
      expect(features).toHaveProperty('persistentStorage');
      expect(features).toHaveProperty('loadBalancer');
      expect(features).toHaveProperty('healthChecks');
      expect(features).toHaveProperty('environmentVariables');
      expect(features).toHaveProperty('customDomains');
      expect(features).toHaveProperty('ssl');
      expect(features).toHaveProperty('logging');
      expect(features).toHaveProperty('metrics');
      expect(features).toHaveProperty('alerts');
      
      // All should be boolean values
      Object.values(features).forEach(value => {
        expect(typeof value).toBe('boolean');
      });
    });

    it('should provide Render-specific features', () => {
      if (platformAdapter.getPlatform() === 'render') {
        const features = platformAdapter.getPlatformFeatures();
        
        expect(features.autoScaling).toBe(true);
        expect(features.loadBalancer).toBe(true);
        expect(features.ssl).toBe(true);
        expect(features.healthChecks).toBe(true);
      }
    });
  });

  describe('Optimization Recommendations', () => {
    it('should provide platform-specific recommendations', () => {
      const recommendations = platformAdapter.getOptimizationRecommendations();
      
      expect(Array.isArray(recommendations)).toBe(true);
      recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });
    });

    it('should provide Render-specific recommendations', () => {
      if (platformAdapter.getPlatform() === 'render') {
        const recommendations = platformAdapter.getOptimizationRecommendations();
        
        expect(recommendations.some(rec => 
          rec.includes('connection pooling') || 
          rec.includes('memory') || 
          rec.includes('cold start')
        )).toBe(true);
      }
    });
  });

  describe('Cold Start Detection', () => {
    it('should detect cold start conditions', () => {
      const shouldOptimize = platformAdapter.shouldOptimizeForColdStart();
      expect(typeof shouldOptimize).toBe('boolean');
    });

    it('should handle cold start optimization', async () => {
      // This test would need to be run in a fresh process to properly test cold start
      await expect(platformAdapter.handleColdStart()).resolves.not.toThrow();
    });
  });

  describe('Render Optimization Service', () => {
    it('should initialize without errors', async () => {
      await expect(renderOptimization.initialize()).resolves.not.toThrow();
    });

    it('should provide Render metrics when on Render platform', () => {
      if (platformAdapter.isRender()) {
        const metrics = renderOptimization.getRenderMetrics();
        
        expect(metrics).toHaveProperty('memoryUsage');
        expect(metrics).toHaveProperty('memoryLimit');
        expect(metrics).toHaveProperty('memoryPercentage');
        expect(metrics).toHaveProperty('uptime');
        expect(metrics).toHaveProperty('lastActivity');
        expect(metrics).toHaveProperty('sleepRisk');
        
        expect(typeof metrics.memoryUsage).toBe('number');
        expect(typeof metrics.memoryLimit).toBe('number');
        expect(typeof metrics.memoryPercentage).toBe('number');
        expect(typeof metrics.uptime).toBe('number');
        expect(typeof metrics.sleepRisk).toBe('boolean');
      }
    });

    it('should perform Render health check', async () => {
      if (platformAdapter.isRender()) {
        const health = await renderOptimization.performRenderHealthCheck();
        
        expect(health).toHaveProperty('status');
        expect(health).toHaveProperty('renderMetrics');
        expect(health).toHaveProperty('recommendations');
        
        expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
        expect(Array.isArray(health.recommendations)).toBe(true);
      }
    });

    it('should update activity timestamp', () => {
      expect(() => renderOptimization.updateActivity()).not.toThrow();
    });

    it('should cleanup resources', () => {
      expect(() => renderOptimization.cleanup()).not.toThrow();
    });
  });
});