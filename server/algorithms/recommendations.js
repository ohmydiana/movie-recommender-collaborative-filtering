const { db } = require('../database');
const { getSimilarityFunction } = require('./similarity');

function computeUserSimilarities(
  algorithm = 'spearman',
  maxSimilarUsers = 10,
  minRatedMoviesForSimilarity = 5
) {
  const startTime = Date.now();
  const similarityFunc = getSimilarityFunction(algorithm);

  const users = db.prepare(`
    SELECT u.id
    FROM users u
    LEFT JOIN ratings r ON r.user_id = u.id
    WHERE u.is_admin = 0
    GROUP BY u.id
    HAVING COUNT(r.id) >= ?
  `).all(minRatedMoviesForSimilarity);
  
  const userRatings = {};
  for (const user of users) {
    const ratings = db.prepare(
      'SELECT product_id, rating FROM ratings WHERE user_id = ?'
    ).all(user.id);
    
    userRatings[user.id] = {};
    for (const rating of ratings) {
      userRatings[user.id][rating.product_id] = rating.rating;
    }
  }

  db.prepare('DELETE FROM user_similarities WHERE algorithm = ?').run(algorithm);

  const insertStmt = db.prepare(
    'INSERT INTO user_similarities (user_a_id, user_b_id, similarity, algorithm) VALUES (?, ?, ?, ?)'
  );

  let similaritiesComputed = 0;
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const userA = users[i].id;
      const userB = users[j].id;

      const similarity = similarityFunc(userRatings[userA], userRatings[userB]);

      insertStmt.run(userA, userB, similarity, algorithm);
      insertStmt.run(userB, userA, similarity, algorithm);
      similaritiesComputed++;
    }
  }

  const elapsedTime = Date.now() - startTime;

  return {
    usersProcessed: users.length,
    eligibleUsers: users.length,
    similaritiesComputed,
    elapsedTime,
    algorithm
  };
}

function computeRecommendations(algorithm = 'spearman', maxSimilarUsers = 10, kConstant = 1.0) {
  const startTime = Date.now();

  const users = db.prepare('SELECT id FROM users WHERE is_admin = 0').all();
  const products = db.prepare('SELECT id FROM products').all();
  const replaceRecommendations = db.transaction(() => {
    db.prepare('DELETE FROM recommendations').run();

    const insertStmt = db.prepare(
      'INSERT INTO recommendations (user_id, product_id, predicted_rating, algorithm) VALUES (?, ?, ?, ?)'
    );

    let recommendationsComputed = 0;

    for (const user of users) {
      const userRatings = db.prepare(
        'SELECT product_id, rating FROM ratings WHERE user_id = ?'
      ).all(user.id);

      const ratedProducts = new Set(userRatings.map(r => r.product_id));
      
      const avgRatingRow = db.prepare(
        'SELECT AVG(rating) as avg FROM ratings WHERE user_id = ?'
      ).get(user.id);
      const userAvgRating = avgRatingRow?.avg || 3.0;

      const similarUsers = db.prepare(`
        SELECT user_b_id as similar_user_id, similarity 
        FROM user_similarities 
        WHERE user_a_id = ? AND algorithm = ? 
        ORDER BY similarity DESC 
        LIMIT ?
      `).all(user.id, algorithm, maxSimilarUsers);

      for (const product of products) {
        if (ratedProducts.has(product.id)) {
          continue;
        }

        let numerator = 0;
        let denominator = 0;

        for (const similar of similarUsers) {
          const similarUserRating = db.prepare(
            'SELECT rating FROM ratings WHERE user_id = ? AND product_id = ?'
          ).get(similar.similar_user_id, product.id);

          if (!similarUserRating) {
            continue;
          }

          const similarUserAvg = db.prepare(
            'SELECT AVG(rating) as avg FROM ratings WHERE user_id = ?'
          ).get(similar.similar_user_id);

          const avgSimilar = similarUserAvg?.avg || 3.0;
          const weight = similar.similarity;

          numerator += weight * (similarUserRating.rating - avgSimilar);
          denominator += Math.abs(weight);
        }

        if (denominator > 0) {
          const predictedRating = userAvgRating + kConstant * (numerator / denominator);
          const clampedRating = Math.max(1, Math.min(5, predictedRating));

          insertStmt.run(user.id, product.id, clampedRating, algorithm);
          recommendationsComputed++;
        }
      }
    }

    return recommendationsComputed;
  });

  const recommendationsComputed = replaceRecommendations();

  const elapsedTime = Date.now() - startTime;

  return {
    usersProcessed: users.length,
    recommendationsComputed,
    elapsedTime,
    algorithm
  };
}

module.exports = {
  computeUserSimilarities,
  computeRecommendations
};
