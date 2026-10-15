const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const algorithm = req.query.algorithm || null;

    let query = `
      SELECT r.*, p.title, p.image_url, p.year, p.genre
      FROM recommendations r
      JOIN products p ON r.product_id = p.id
      WHERE r.user_id = ?
        AND NOT EXISTS (
          SELECT 1
          FROM ratings ur
          WHERE ur.user_id = r.user_id AND ur.product_id = r.product_id
        )
    `;

    const params = [req.user.id];

    if (algorithm) {
      query += ' AND r.algorithm = ?';
      params.push(algorithm);
    }

    query += ' ORDER BY r.predicted_rating DESC LIMIT ?';
    params.push(limit);

    const recommendations = db.prepare(query).all(...params);

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

router.get('/stats', authenticateToken, (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        algorithm,
        COUNT(*) as count,
        AVG(predicted_rating) as avg_rating,
        MAX(computed_at) as last_computed
      FROM recommendations
      WHERE user_id = ?
      GROUP BY algorithm
    `).all(req.user.id);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
