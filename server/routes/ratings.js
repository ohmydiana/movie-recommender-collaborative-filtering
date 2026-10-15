const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateToken, (req, res) => {
  try {
    const { productId, rating } = req.body;

    if (!productId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Valid productId and rating (1-5) required' });
    }

    const stmt = db.prepare(
      'INSERT OR REPLACE INTO ratings (user_id, product_id, rating) VALUES (?, ?, ?)'
    );

    stmt.run(req.user.id, productId, rating);

    res.json({ message: 'Rating saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

router.get('/user', authenticateToken, (req, res) => {
  try {
    const ratings = db.prepare(`
      SELECT r.*, p.title, p.image_url 
      FROM ratings r 
      JOIN products p ON r.product_id = p.id 
      WHERE r.user_id = ? 
      ORDER BY r.created_at DESC
    `).all(req.user.id);

    res.json(ratings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

router.delete('/:productId', authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare(
      'DELETE FROM ratings WHERE user_id = ? AND product_id = ?'
    );

    stmt.run(req.user.id, req.params.productId);

    res.json({ message: 'Rating deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete rating' });
  }
});

module.exports = router;
