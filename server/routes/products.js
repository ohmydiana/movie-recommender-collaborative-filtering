const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const filter = req.query.filter || 'all';

    let query = `
      SELECT 
        p.*,
        EXISTS(
          SELECT 1
          FROM recommendations rec
          WHERE rec.product_id = p.id
            AND rec.user_id = ?
            AND NOT EXISTS (
              SELECT 1
              FROM ratings ur_rec
              WHERE ur_rec.product_id = p.id AND ur_rec.user_id = ?
            )
        ) as is_recommended,
        COALESCE(AVG(r.rating), 0) as avg_rating
      FROM products p
      LEFT JOIN ratings r ON r.product_id = p.id
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM products';
    const queryParams = [req.user.id, req.user.id];
    const countParams = [];
    const productWhereClauses = [];
    const countWhereClauses = [];

    if (search) {
      productWhereClauses.push('p.title LIKE ?');
      countWhereClauses.push('title LIKE ?');
      queryParams.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    if (filter === 'recommended') {
      productWhereClauses.push(`
        EXISTS (
          SELECT 1
          FROM recommendations rec_filter
          WHERE rec_filter.product_id = p.id
            AND rec_filter.user_id = ?
            AND NOT EXISTS (
              SELECT 1
              FROM ratings ur_rec
              WHERE ur_rec.product_id = p.id AND ur_rec.user_id = ?
            )
        )
      `);
      countWhereClauses.push(`
        EXISTS (
          SELECT 1
          FROM recommendations rec_filter
          WHERE rec_filter.product_id = products.id
            AND rec_filter.user_id = ?
            AND NOT EXISTS (
              SELECT 1
              FROM ratings ur_rec
              WHERE ur_rec.product_id = products.id AND ur_rec.user_id = ?
            )
        )
      `);
      queryParams.push(req.user.id, req.user.id);
      countParams.push(req.user.id, req.user.id);
    } else if (filter === 'rated') {
      productWhereClauses.push(`
        EXISTS (
          SELECT 1
          FROM ratings ur
          WHERE ur.product_id = p.id AND ur.user_id = ?
        )
      `);
      countWhereClauses.push(`
        EXISTS (
          SELECT 1
          FROM ratings ur
          WHERE ur.product_id = products.id AND ur.user_id = ?
        )
      `);
      queryParams.push(req.user.id);
      countParams.push(req.user.id);
    } else if (filter === 'unrated') {
      productWhereClauses.push(`
        NOT EXISTS (
          SELECT 1
          FROM ratings ur
          WHERE ur.product_id = p.id AND ur.user_id = ?
        )
      `);
      countWhereClauses.push(`
        NOT EXISTS (
          SELECT 1
          FROM ratings ur
          WHERE ur.product_id = products.id AND ur.user_id = ?
        )
      `);
      queryParams.push(req.user.id);
      countParams.push(req.user.id);
    }

    if (productWhereClauses.length > 0) {
      query += ` WHERE ${productWhereClauses.join(' AND ')}`;
    }

    if (countWhereClauses.length > 0) {
      countQuery += ` WHERE ${countWhereClauses.join(' AND ')}`;
    }

    query += ' GROUP BY p.id ORDER BY is_recommended DESC, avg_rating DESC, p.title ASC LIMIT ? OFFSET ?';
    
    const products = db.prepare(query).all(...queryParams, limit, offset);
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/:id', authenticateToken, (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const avgRating = db.prepare(
      'SELECT AVG(rating) as avg, COUNT(*) as count FROM ratings WHERE product_id = ?'
    ).get(product.id);

    const userRating = db.prepare(
      'SELECT rating FROM ratings WHERE user_id = ? AND product_id = ?'
    ).get(req.user.id, product.id);

    res.json({
      ...product,
      avgRating: avgRating.avg || 0,
      ratingCount: avgRating.count,
      userRating: userRating?.rating || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

module.exports = router;
