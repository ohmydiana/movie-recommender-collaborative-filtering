import React, { useState, useEffect } from 'react';
import { API_URL } from '../App';
import StarRating from './StarRating';

export default function Products({ user }) {
  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'recommended', label: 'Recommended' },
    { value: 'rated', label: 'Rated' },
    { value: 'unrated', label: 'Unrated' }
  ];

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, [page, search, filter]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [productsResponse, recommendationsResponse] = await Promise.all([
        fetch(
          `${API_URL}/products?page=${page}&limit=12&search=${encodeURIComponent(search)}&filter=${encodeURIComponent(filter)}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        ),
        fetch(`${API_URL}/recommendations?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      const [data, recommendations] = await Promise.all([
        productsResponse.json(),
        recommendationsResponse.json()
      ]);

      if (!productsResponse.ok) {
        throw new Error(data.error || 'Failed to fetch products');
      }
      if (!recommendationsResponse.ok) {
        throw new Error(recommendations.error || 'Failed to fetch recommendations');
      }

      const productsWithDetails = await Promise.all(
        data.products.map(async (product) => {
          const detailResponse = await fetch(`${API_URL}/products/${product.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          return detailResponse.json();
        })
      );

      const recommendationsById = new Map(
        recommendations.map((recommendation) => [recommendation.product_id, recommendation])
      );

      const mergedProducts = productsWithDetails
        .map((product) => {
          const recommendation = recommendationsById.get(product.id);

          return {
            ...product,
            isRecommended: Boolean(recommendation),
            predictedRating: recommendation?.predicted_rating || null,
            recommendationAlgorithm: recommendation?.algorithm || null
          };
        })
        .sort((a, b) => {
          if (a.isRecommended !== b.isRecommended) {
            return a.isRecommended ? -1 : 1;
          }

          const avgRatingDifference = (b.avgRating || 0) - (a.avgRating || 0);
          if (avgRatingDifference !== 0) {
            return avgRatingDifference;
          }

          return a.title.localeCompare(b.title);
        });

      setProducts(mergedProducts);
      setPagination(data.pagination);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRating = async (productId, rating) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/ratings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productId, rating })
      });

      if (!response.ok) {
        throw new Error('Failed to save rating');
      }

      setProducts(prevProducts => {
        const updatedProducts = prevProducts
          .map((product) => (
            product.id === productId
              ? {
                  ...product,
                  userRating: rating,
                  isRecommended: false,
                  predictedRating: null,
                  recommendationAlgorithm: null
                }
              : product
          ))
          .sort((a, b) => {
            if (a.isRecommended !== b.isRecommended) {
              return a.isRecommended ? -1 : 1;
            }

            const avgRatingDifference = (b.avgRating || 0) - (a.avgRating || 0);
            if (avgRatingDifference !== 0) {
              return avgRatingDifference;
            }

            return a.title.localeCompare(b.title);
          });

        if (filter === 'recommended') {
          return updatedProducts.filter((product) => product.id !== productId);
        }

        return updatedProducts;
      });
    } catch (err) {
      alert('Failed to save rating: ' + err.message);
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleFilterChange = (nextFilter) => {
    setFilter(nextFilter);
    setPage(1);
  };

  if (loading && products.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading movies...</p>
      </div>
    );
  }

  return (
    <div className="products-container">
      <div className="products-header">
        <div>
          <h1>Browse Movies</h1>
          <p className="products-subtitle">
            Recommended movies are highlighted so you can rate them directly here.
          </p>
        </div>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search movies..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      <div className="products-filters">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`filter-chip ${filter === option.value ? 'active' : ''}`}
            onClick={() => handleFilterChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && <div className="error-message">{error}</div>}

      {products.length === 0 && !loading ? (
        <div className="empty-state">
          <h2>No movies match this filter</h2>
          <p>Try another filter or search term.</p>
        </div>
      ) : (
        <div className="products-grid">
          {products.map(product => (
          <div
            key={product.id}
            className={`product-card ${product.isRecommended ? 'recommended' : 'default'}`}
          >
            {product.isRecommended && (
              <div className="recommendation-banner">
                <span className="recommendation-banner-label">Recommended for you</span>
                <span className="predicted-rating">
                  ★ {product.predictedRating.toFixed(2)}
                </span>
              </div>
            )}
            <div className="product-header">
              <h3>{product.title}</h3>
            </div>
            <div className="product-genre">{product.genre}</div>
            {product.isRecommended && (
              <div className="recommendation-footer">
                <span className="algorithm-badge">{product.recommendationAlgorithm}</span>
              </div>
            )}
            
            <div className="product-ratings">
              <div className="rating-section">
                <span className="rating-label">Average Rating:</span>
                <StarRating rating={product.avgRating || 0} readOnly={true} />
                <span className="rating-count">({product.ratingCount} ratings)</span>
              </div>
              
              <div className="rating-section">
                <span className="rating-label">Your Rating:</span>
                <StarRating 
                  rating={product.userRating || 0} 
                  onRate={(rating) => handleRating(product.id, rating)}
                />
              </div>
            </div>
          </div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="btn btn-secondary"
          >
            Previous
          </button>
          <span className="page-info">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.totalPages}
            className="btn btn-secondary"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
