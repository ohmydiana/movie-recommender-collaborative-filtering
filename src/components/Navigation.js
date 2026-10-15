import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navigation({ user, onLogout }) {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <h2>Movie Recommendations</h2>
        </div>

        <div className="nav-links">
          <Link 
            to="/products" 
            className={location.pathname === '/products' ? 'active' : ''}
          >
            Movies
          </Link>
          {user.isAdmin && (
            <Link 
              to="/admin" 
              className={location.pathname === '/admin' ? 'active' : ''}
            >
              Admin Panel
            </Link>
          )}
        </div>

        <div className="nav-user">
          <span className="username">{user.username}</span>
          {user.isAdmin && <span className="admin-badge">Admin</span>}
          <button onClick={onLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
