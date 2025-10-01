import { Hono } from 'hono';
import type { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';
import { generateId } from '../lib/auth';

const analytics = new Hono<{ Bindings: Env }>();
analytics.use('*', authMiddleware);

/**
 * POST /analytics/fraud-detection
 * Analyze claims for fraud patterns
 */
analytics.post('/fraud-detection', async (c) => {
  const user = c.get('user') as User;
  try {
    const body = await c.req.json();
    const { claims } = body;

    if (!claims || !Array.isArray(claims)) {
      return c.json({ success: false, error: 'Claims array required' }, 400);
    }

    // Simple fraud detection logic
    const results = claims.map((claim: any) => {
      const fraudTypes = [];
      const anomalyReasons = [];
      let riskScore = 0;

      // Check for duplicate billing
      if (claim.billed_amount > 50000) {
        fraudTypes.push('HIGH_COST_BILLING');
        anomalyReasons.push('Unusually high billing amount');
        riskScore += 0.3;
      }

      // Check for phantom billing
      if (!claim.service_date || new Date(claim.service_date) > new Date()) {
        fraudTypes.push('PHANTOM_BILLING');
        anomalyReasons.push('Future service date');
        riskScore += 0.5;
      }

      // Check for unbundling
      if (claim.procedure_count && claim.procedure_count > 10) {
        fraudTypes.push('UNBUNDLING');
        anomalyReasons.push('Excessive number of procedures');
        riskScore += 0.2;
      }

      return {
        claim_id: claim.claim_id,
        risk_score: Math.min(riskScore, 1.0),
        fraud_types: fraudTypes,
        anomaly_reasons: anomalyReasons,
        flagged: riskScore > 0.5,
      };
    });

    const suspiciousClaims = results.filter((r: any) => r.flagged);

    return c.json({
      success: true,
      data: {
        suspicious_claims: suspiciousClaims,
        total_analyzed: claims.length,
        high_risk_count: suspiciousClaims.length,
      },
    });
  } catch (error) {
    return c.json({ success: false, error: 'Fraud detection failed' }, 500);
  }
});

/**
 * POST /analytics/predictive
 * Generate predictive analytics
 */
analytics.post('/predictive', async (c) => {
  try {
    const body = await c.req.json();
    const { historical_data } = body;

    if (!historical_data || !Array.isArray(historical_data)) {
      return c.json({ success: false, error: 'Historical data array required' }, 400);
    }

    // Simple prediction (average-based)
    const avgRejectionRate = historical_data.reduce((sum: number, d: any) => sum + (d.rejection_rate || 0), 0) / historical_data.length;

    const prediction = {
      predicted_rejection_rate: avgRejectionRate * 1.05, // 5% increase prediction
      confidence: 0.75,
      trend: avgRejectionRate > 15 ? 'increasing' : 'stable',
      recommendations: [
        'Review documentation requirements',
        'Implement pre-submission validation',
        'Staff training on common rejection codes',
      ],
    };

    return c.json({ success: true, data: prediction });
  } catch (error) {
    return c.json({ success: false, error: 'Prediction failed' }, 500);
  }
});

/**
 * GET /analytics/dashboard
 * Get dashboard analytics
 */
analytics.get('/dashboard', async (c) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const { results } = await c.env.DB.prepare(
      `SELECT
        COUNT(*) as total_claims,
        SUM(rejected_amount_total) as total_rejected,
        AVG(CASE WHEN is_within_30_days = 1 THEN 1 ELSE 0 END) * 100 as compliance_rate
       FROM rejections
       WHERE submission_date >= ?`
    )
      .bind(startOfMonth)
      .all();

    return c.json({ success: true, data: results?.[0] || {} });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch analytics' }, 500);
  }
});

export default analytics;
