import { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Synchronous log out local cleanup
  const handleLocalLogout = () => {
    setUser(null);
    setAccessToken('');
  };

  // Refresh user profile details
  const refreshUser = async () => {
    try {
      const response = await api.post('/auth/refresh');
      const { accessToken } = response.data;
      setAccessToken(accessToken);
      
      const base64Url = accessToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decodedUser = JSON.parse(jsonPayload);
      
      const updatedUser = {
        id: decodedUser.id,
        email: decodedUser.email,
        role: decodedUser.role,
        fullName: decodedUser.fullName || 'User'
      };
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      handleLocalLogout();
      throw err;
    }
  };

  // Perform silent authentication refresh on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await refreshUser();
      } catch (err) {
        // Safe to ignore on mount (means no active cookie session)
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for forced logout event triggered by Axios Interceptor
    window.addEventListener('auth-logout', handleLocalLogout);
    return () => {
      window.removeEventListener('auth-logout', handleLocalLogout);
    };
  }, []);

  // Login handler
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, user: userData } = response.data;
      
      setAccessToken(accessToken);
      setUser(userData);
      return { success: true };
    } catch (error) {
      handleLocalLogout();
      const message = error.response?.data?.message || 'Login failed. Please check credentials.';
      const resetTime = error.response?.data?.resetTime || null;
      return { success: false, message, resetTime };
    } finally {
      setLoading(false);
    }
  };

  // Sign up handler
  const signup = async (email, password, fullName) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/signup', { email, password, fullName });
      return { success: true, message: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Sign up failed. Please try again.';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API request failed:', error.message);
    } finally {
      handleLocalLogout();
    }
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isPremium: user?.role === 'premium' || user?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
