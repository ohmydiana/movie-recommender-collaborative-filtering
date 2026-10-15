function spearmanCorrelation(ratingsA, ratingsB) {
  const commonProducts = Object.keys(ratingsA).filter(productId => 
    ratingsB.hasOwnProperty(productId)
  );

  if (commonProducts.length < 2) {
    return 0;
  }

  const rankingsA = getRankings(commonProducts.map(id => ratingsA[id]));
  const rankingsB = getRankings(commonProducts.map(id => ratingsB[id]));

  let sumSquaredDiff = 0;
  for (let i = 0; i < rankingsA.length; i++) {
    const diff = rankingsA[i] - rankingsB[i];
    sumSquaredDiff += diff * diff;
  }

  const n = commonProducts.length;
  const rho = 1 - (6 * sumSquaredDiff) / (n * (n * n - 1));

  return rho;
}

function getRankings(values) {
  const indexed = values.map((value, index) => ({ value, index }));
  indexed.sort((a, b) => b.value - a.value);

  const rankings = new Array(values.length);
  for (let rank = 0; rank < indexed.length; rank++) {
    rankings[indexed[rank].index] = rank + 1;
  }

  return rankings;
}

function pearsonCorrelation(ratingsA, ratingsB) {
  const commonProducts = Object.keys(ratingsA).filter(productId => 
    ratingsB.hasOwnProperty(productId)
  );

  if (commonProducts.length < 2) {
    return 0;
  }

  const valuesA = commonProducts.map(id => ratingsA[id]);
  const valuesB = commonProducts.map(id => ratingsB[id]);

  const meanA = valuesA.reduce((sum, val) => sum + val, 0) / valuesA.length;
  const meanB = valuesB.reduce((sum, val) => sum + val, 0) / valuesB.length;

  let numerator = 0;
  let sumSquaredA = 0;
  let sumSquaredB = 0;

  for (let i = 0; i < valuesA.length; i++) {
    const diffA = valuesA[i] - meanA;
    const diffB = valuesB[i] - meanB;
    numerator += diffA * diffB;
    sumSquaredA += diffA * diffA;
    sumSquaredB += diffB * diffB;
  }

  const denominator = Math.sqrt(sumSquaredA * sumSquaredB);

  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

function cosineSimilarity(ratingsA, ratingsB) {
  const commonProducts = Object.keys(ratingsA).filter(productId => 
    ratingsB.hasOwnProperty(productId)
  );

  if (commonProducts.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (const productId of commonProducts) {
    const ratingA = ratingsA[productId];
    const ratingB = ratingsB[productId];
    dotProduct += ratingA * ratingB;
    magnitudeA += ratingA * ratingA;
    magnitudeB += ratingB * ratingB;
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

function getSimilarityFunction(algorithmName) {
  switch (algorithmName.toLowerCase()) {
    case 'spearman':
      return spearmanCorrelation;
    case 'pearson':
      return pearsonCorrelation;
    case 'cosine':
      return cosineSimilarity;
    default:
      return spearmanCorrelation;
  }
}

module.exports = {
  spearmanCorrelation,
  pearsonCorrelation,
  cosineSimilarity,
  getSimilarityFunction
};
