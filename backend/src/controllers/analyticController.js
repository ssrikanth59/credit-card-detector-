const TransactionModel = require('../models/Transaction');

class AnalyticController {
  static async getDashboardMetrics(req, res) {
    try {
      const transactions = await TransactionModel.find({});
      
      let totalVolume = 0;
      let preventedVolume = 0;
      let approvedCount = 0;
      let blockedCount = 0;
      let pendingReviewCount = 0;
      let totalRisk = 0;
      let reportedFraudCount = 0;

      transactions.forEach(t => {
        totalRisk += t.riskScore;
        
        if (t.status === 'APPROVED') {
          totalVolume += t.amount;
          approvedCount++;
        } else if (t.status === 'BLOCKED') {
          preventedVolume += t.amount;
          blockedCount++;
        } else if (t.status === 'PENDING_REVIEW') {
          totalVolume += t.amount; // counted in volume but flagged
          pendingReviewCount++;
        } else if (t.status === 'REPORTED_FRAUD') {
          totalVolume += t.amount;
          reportedFraudCount++;
        }
      });

      const totalCount = transactions.length;
      const avgRiskScore = totalCount > 0 ? Math.round(totalRisk / totalCount) : 0;
      const fraudRate = totalCount > 0 ? parseFloat(((blockedCount + reportedFraudCount) / totalCount * 100).toFixed(2)) : 0.0;

      // Group by merchantCategory
      const categoriesMap = {};
      transactions.forEach(t => {
        const cat = t.merchantCategory || 'Retail';
        categoriesMap[cat] = (categoriesMap[cat] || 0) + t.amount;
      });
      const categoryDistribution = Object.keys(categoriesMap).map(name => ({
        name,
        value: parseFloat(categoriesMap[name].toFixed(2))
      }));

      // Group by risk distribution
      let lowRisk = 0; // < 30
      let midRisk = 0; // 30 - 70
      let highRisk = 0; // >= 70
      
      transactions.forEach(t => {
        if (t.riskScore < 30) lowRisk++;
        else if (t.riskScore < 70) midRisk++;
        else highRisk++;
      });

      const riskDistribution = [
        { name: 'Low Risk (<30%)', value: lowRisk, color: '#10B981' },
        { name: 'Medium Risk (30-69%)', value: midRisk, color: '#F59E0B' },
        { name: 'High Risk (>=70%)', value: highRisk, color: '#EF4444' }
      ];

      // Volume over time (last 7 days or custom intervals)
      // Since it is mock data or real data, let's group by date
      const dateMap = {};
      transactions.forEach(t => {
        const dateStr = new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!dateMap[dateStr]) {
          dateMap[dateStr] = { date: dateStr, legitVolume: 0, fraudVolume: 0, legitCount: 0, fraudCount: 0 };
        }
        if (t.status === 'BLOCKED' || t.status === 'REPORTED_FRAUD') {
          dateMap[dateStr].fraudVolume += t.amount;
          dateMap[dateStr].fraudCount++;
        } else {
          dateMap[dateStr].legitVolume += t.amount;
          dateMap[dateStr].legitCount++;
        }
      });

      // Sort dates
      const dailyTrends = Object.values(dateMap).reverse().slice(-10); // last 10 entries

      res.status(200).json({
        success: true,
        metrics: {
          totalVolumeProcessed: parseFloat(totalVolume.toFixed(2)),
          totalVolumePrevented: parseFloat(preventedVolume.toFixed(2)),
          totalTransactions: totalCount,
          pendingAlertsCount: pendingReviewCount,
          averageRiskScore: avgRiskScore,
          fraudRate
        },
        charts: {
          categoryDistribution,
          riskDistribution,
          dailyTrends
        }
      });
    } catch (error) {
      console.error('Error fetching metrics:', error.message);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

module.exports = AnalyticController;
