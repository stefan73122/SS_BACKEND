const dashboardService = require('../services/dashboard.service');
const { serializeBigInt } = require('../utils/bigintSerializer');

async function getDashboardStats(req, res) {
  try {
    const userId = req.user.userId;
    const roles = req.user.roles || [];

    const stats = await dashboardService.getDashboardStats(userId, roles);
    res.json(serializeBigInt(stats));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getDashboardStats,
};
