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
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.data);
      setMustChangePassword(response.data.data.must_change_password);
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });

      const { token, user, must_change_password } = response.data.data;

      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      setMustChangePassword(must_change_password);

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return {
        success: true,
        user,
        must_change_password
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
    mustChangePassword,
    setMustChangePassword,
    isAuthenticated: !!user
  };


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};