import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      const u = response.data.data;

      setUser({
        ...u,
        must_change_password: u.must_change_password
      });

    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };


  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });

      const token = response.data.data.token;
      const user  = response.data.data.user;
      const mustChangePassword = response.data.data.mustChangePassword;

      // Įrašome token LOCAL STORAGE
      localStorage.setItem('token', token);
      setToken(token);

      // Sustatome user state su must_change_password flagu
      setUser({
        ...user,
        must_change_password: mustChangePassword,
      });

      // Pridedame Authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return {
        success: true,
        mustChangePassword
      };

    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Prisijungimo klaida'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
