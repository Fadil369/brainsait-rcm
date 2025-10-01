import { Hono } from 'hono';
import type { Env } from './types';
import { corsMiddleware } from './middleware/cors';

// Import routes
import authRoutes from './routes/auth';
import rejectionsRoutes from './routes/rejections';
import appealsRoutes from './routes/appeals';
import lettersRoutes from './routes/letters';
import auditRoutes from './routes/audit';
import analyticsRoutes from './routes/analytics';
import nphiesRoutes from './routes/nphies';

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', corsMiddleware);

// Health check endpoint
app.get('/health', async (c) => {
  try {
    // Test database connection
    await c.env.DB.prepare('SELECT 1').first();

    return c.json({
      status: 'healthy',
      database: 'connected',
      environment: c.env.ENVIRONMENT,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        status: 'degraded',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      503
    );
  }
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'BrainSAIT RCM API',
    version: '1.0.0',
    description: 'Healthcare Claims & Rejections Management System',
    environment: c.env.ENVIRONMENT,
    endpoints: {
      health: '/health',
      auth: '/auth/*',
      rejections: '/rejections/*',
      appeals: '/appeals/*',
      letters: '/letters/*',
      audit: '/audit/*',
      analytics: '/analytics/*',
      nphies: '/nphies/*',
    },
  });
});

// Mount routes
app.route('/auth', authRoutes);
app.route('/rejections', rejectionsRoutes);
app.route('/appeals', appealsRoutes);
app.route('/letters', lettersRoutes);
app.route('/audit', auditRoutes);
app.route('/analytics', analyticsRoutes);
app.route('/nphies', nphiesRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: 'Endpoint not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Application error:', err);
  return c.json(
    {
      success: false,
      error: 'Internal server error',
      message: c.env.ENVIRONMENT === 'development' ? err.message : undefined,
    },
    500
  );
});

export default app;
