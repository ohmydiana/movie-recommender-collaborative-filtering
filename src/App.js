import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Products from './components/Products';
import AdminPanel from './components/AdminPanel';
import Navigation from './components/Navigation';
import './styles/App.css';

const API_URL = 'http://localhost:5000/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.id) {
            setUser(data);
          } else {
            localStorage.removeItem('token');
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        {user && <Navigation user={user} onLogout={handleLogout} />}
        
        <div className="main-content">
          <Routes>
            <Route 
              path="/login" 
              element={user ? <Navigate to="/products" /> : <Login onLogin={handleLogin} />} 
            />
            <Route 
              path="/register" 
              element={user ? <Navigate to="/products" /> : <Register onLogin={handleLogin} />} 
            />
            <Route 
              path="/products" 
              element={user ? <Products user={user} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/recommendations" 
              element={<Navigate to={user ? "/products" : "/login"} replace />} 
            />
            <Route 
              path="/admin" 
              element={user?.isAdmin ? <AdminPanel /> : <Navigate to="/products" />} 
            />
            <Route 
              path="/" 
              element={<Navigate to={user ? "/products" : "/login"} />} 
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export { API_URL };
