import React, { useState, useEffect } from 'react';
import { API_URL } from '../App';

export default function Recommendations({ user }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [algorithm, setAlgorithm] = useState('');

  useEffect(() => {
    fetchRecommendations();
  }, [algorithm]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = algorithm 
        ? `${API_URL}/recommendations?algorithm=${algorithm}&limit=20`
        : `${API_URL}/recommendations?limit=20`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recommendations');
      }

      setRecommendations(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading recommendations...</p>
      </div>
    );
  }

  return (
    <div className="recommendations-container">
      <div className="recommendations-header">
        <h1>Recommended Movies for You</h1>
        <div className="filter-section">
          <label htmlFor="algorithm">Algorithm:</label>
          <select 
            id="algorithm"
            value={algorithm} 
            onChange={(e) => setAlgorithm(e.target.value)}
            className="algorithm-select"
          >
            <option value="">All</option>
            <option value="spearman">Spearman</option>
            <option value="pearson">Pearson</option>
            <option value="cosine">Cosine</option>
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {recommendations.length === 0 ? (
        <div className="empty-state">
          <h2>No recommendations yet</h2>
          <p>
            The admin needs to compute recommendations first. 
            Go to the Admin Panel to generate recommendations based on your ratings.
          </p>
        </div>
      ) : (
        <div className="recommendations-grid">
          {recommendations.map(rec => (
            <div key={rec.id} className="recommendation-card">
              <div className="recommendation-header">
                <h3>{rec.title}</h3>
                <span className="predicted-rating">
                  ★ {rec.predicted_rating.toFixed(2)}
                </span>
              </div>
              <div className="recommendation-meta">
                <span className="recommendation-genre">{rec.genre}</span>
              </div>
              <div className="recommendation-footer">
                <span className="algorithm-badge">{rec.algorithm}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
