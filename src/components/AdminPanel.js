import React, { useState, useEffect } from 'react';
import { API_URL } from '../App';

export default function AdminPanel() {
  const [config, setConfig] = useState({
    similarity_algorithm: 'spearman',
    max_similar_users: '10',
    k_constant: '1.0',
    min_rated_movies_for_similarity: '5'
  });
  const [stats, setStats] = useState(null);
  const [computing, setComputing] = useState(false);
  const [message, setMessage] = useState('');
  const [computeResults, setComputeResults] = useState(null);

  useEffect(() => {
    fetchConfig();
    fetchStats();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/admin/config`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setConfig(prev => ({ ...prev, ...data }));
    } catch (err) {
      console.error('Failed to fetch config:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const saveConfig = async (key, value) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/admin/config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key, value })
      });
      setMessage('Configuration saved successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to save configuration');
    }
  };

  const computeSimilarities = async () => {
    setComputing(true);
    setMessage('Computing similarities...');
    setComputeResults(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/admin/compute-similarities`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          algorithm: config.similarity_algorithm,
          maxSimilarUsers: config.max_similar_users,
          minRatedMoviesForSimilarity: config.min_rated_movies_for_similarity
        })
      });

      const data = await response.json();
      
      setComputeResults(data);
      setMessage('Similarities computed successfully!');
      fetchStats();
    } catch (err) {
      setMessage('Failed to compute similarities: ' + err.message);
    } finally {
      setComputing(false);
    }
  };

  const computeRecommendations = async () => {
    setComputing(true);
    setMessage('Computing recommendations...');
    setComputeResults(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/admin/compute-recommendations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          algorithm: config.similarity_algorithm,
          maxSimilarUsers: config.max_similar_users,
          kConstant: config.k_constant
        })
      });

      const data = await response.json();
      
      setComputeResults(data);
      setMessage('Recommendations computed successfully!');
      fetchStats();
    } catch (err) {
      setMessage('Failed to compute recommendations: ' + err.message);
    } finally {
      setComputing(false);
    }
  };

  return (
    <div className="admin-container">
      <h1>Admin Panel</h1>
      
      {message && (
        <div className={`message ${message.includes('Failed') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="admin-grid">
        <div className="admin-section">
          <h2>Configuration</h2>
          
          <div className="config-group">
            <label htmlFor="algorithm">Similarity Algorithm</label>
            <select
              id="algorithm"
              value={config.similarity_algorithm}
              onChange={(e) => handleConfigChange('similarity_algorithm', e.target.value)}
              onBlur={(e) => saveConfig('similarity_algorithm', e.target.value)}
            >
              <option value="spearman">Spearman Correlation</option>
              <option value="pearson">Pearson Correlation</option>
              <option value="cosine">Cosine Similarity</option>
            </select>
          </div>

          <div className="config-group">
            <label htmlFor="max-users">Max Similar Users (n)</label>
            <input
              id="max-users"
              type="number"
              min="1"
              max="100"
              value={config.max_similar_users}
              onChange={(e) => handleConfigChange('max_similar_users', e.target.value)}
              onBlur={(e) => saveConfig('max_similar_users', e.target.value)}
            />
          </div>

          <div className="config-group">
            <label htmlFor="k-constant">K Constant (κ)</label>
            <input
              id="k-constant"
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={config.k_constant}
              onChange={(e) => handleConfigChange('k_constant', e.target.value)}
              onBlur={(e) => saveConfig('k_constant', e.target.value)}
            />
          </div>

          <div className="config-group">
            <label htmlFor="min-rated-movies">
              Min Rated Movies for Similarity
            </label>
            <input
              id="min-rated-movies"
              type="number"
              min="5"
              max="1000"
              value={config.min_rated_movies_for_similarity}
              onChange={(e) => handleConfigChange('min_rated_movies_for_similarity', e.target.value)}
              onBlur={(e) => saveConfig('min_rated_movies_for_similarity', e.target.value)}
            />
          </div>
        </div>

        <div className="admin-section">
          <h2>Database Statistics</h2>
          {stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats.users}</div>
                <div className="stat-label">Users</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.products}</div>
                <div className="stat-label">Movies</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.ratings}</div>
                <div className="stat-label">Ratings</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.usersWithSimilarities}</div>
                <div className="stat-label">Users with Similarities</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.usersWithRecommendations}</div>
                <div className="stat-label">Users with Recommendations</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.avgRatingsPerUser.toFixed(1)}</div>
                <div className="stat-label">Avg Ratings per User</div>
              </div>
            </div>
          )}
        </div>

        <div className="admin-section">
          <h2>Compute Operations</h2>
          
          <div className="compute-actions">
            <button
              onClick={computeSimilarities}
              disabled={computing}
              className="btn btn-primary"
            >
              {computing ? 'Computing...' : 'Compute User Similarities'}
            </button>

            <button
              onClick={computeRecommendations}
              disabled={computing}
              className="btn btn-primary"
            >
              {computing ? 'Computing...' : 'Compute Recommendations'}
            </button>
          </div>

          {computeResults && (
            <div className="compute-results">
              <h3>Computation Results</h3>
              <p><strong>Algorithm:</strong> {computeResults.algorithm}</p>
              <p><strong>Users Processed:</strong> {computeResults.usersProcessed}</p>
              {computeResults.eligibleUsers !== undefined && (
                <p><strong>Eligible Users:</strong> {computeResults.eligibleUsers}</p>
              )}
              {computeResults.similaritiesComputed !== undefined && (
                <p><strong>Similarities Computed:</strong> {computeResults.similaritiesComputed}</p>
              )}
              {computeResults.recommendationsComputed !== undefined && (
                <p><strong>Recommendations Computed:</strong> {computeResults.recommendationsComputed}</p>
              )}
              <p><strong>Time Elapsed:</strong> {(computeResults.elapsedTime / 1000).toFixed(2)}s</p>
            </div>
          )}

          <div className="algorithm-info">
            <h3>Algorithm Formulas</h3>
            <div className="formula-section">
              <h4>Spearman Correlation</h4>
              <p>ρ = 1 - (6Σd²) / (n(n² - 1))</p>
            </div>
            <div className="formula-section">
              <h4>Prediction Formula</h4>
              <p>p(a,j) = v̄(a) + κ × Σ w(a,i)(v(i,j) - v̄(i))</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
