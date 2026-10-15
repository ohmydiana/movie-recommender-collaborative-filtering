const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { computeUserSimilarities, computeRecommendations } = require('../algorithms/recommendations');

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/config', (req, res) => {
  try {
    const configs = db.prepare('SELECT key, value FROM config').all();
    const configObj = {};
    configs.forEach(c => {
      configObj[c.key] = c.value;
    });
    res.json(configObj);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

router.put('/config', (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value required' });
    }

    const stmt = db.prepare(
      'INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
    );

    stmt.run(key, String(value));

    res.json({ message: 'Config updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update config' });
  }
});

router.post('/compute-similarities', (req, res) => {
  try {
    const { algorithm, maxSimilarUsers, minRatedMoviesForSimilarity } = req.body;

    const result = computeUserSimilarities(
      algorithm || 'spearman',
      parseInt(maxSimilarUsers) || 10,
      parseInt(minRatedMoviesForSimilarity) || 5
    );

    res.json({
      message: 'Similarities computed successfully',
      ...result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to compute similarities' });
  }
});

router.post('/compute-recommendations', (req, res) => {
  try {
    const { algorithm, maxSimilarUsers, kConstant } = req.body;

    const result = computeRecommendations(
      algorithm || 'spearman',
      parseInt(maxSimilarUsers) || 10,
      parseFloat(kConstant) || 1.0
    );

    res.json({
      message: 'Recommendations computed successfully',
      ...result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to compute recommendations' });
  }
});

router.get('/stats', (req, res) => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 0').get();
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
    const ratingCount = db.prepare('SELECT COUNT(*) as count FROM ratings').get();
    const similarityCount = db.prepare('SELECT COUNT(DISTINCT user_a_id) as count FROM user_similarities').get();
    const recommendationCount = db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM recommendations').get();

    const avgRatingsPerUser = db.prepare(
      'SELECT AVG(rating_count) as avg FROM (SELECT COUNT(*) as rating_count FROM ratings GROUP BY user_id)'
    ).get();

    res.json({
      users: userCount.count,
      products: productCount.count,
      ratings: ratingCount.count,
      usersWithSimilarities: similarityCount.count,
      usersWithRecommendations: recommendationCount.count,
      avgRatingsPerUser: avgRatingsPerUser.avg || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/similarities', (req, res) => {
  try {
    const algorithm = req.query.algorithm || 'spearman';
    const limit = parseInt(req.query.limit) || 50;

    const similarities = db.prepare(`
      SELECT 
        s.*,
        ua.username as user_a_name,
        ub.username as user_b_name
      FROM user_similarities s
      JOIN users ua ON s.user_a_id = ua.id
      JOIN users ub ON s.user_b_id = ub.id
      WHERE s.algorithm = ?
      ORDER BY s.similarity DESC
      LIMIT ?
    `).all(algorithm, limit);

    res.json(similarities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch similarities' });
  }
});

module.exports = router;
