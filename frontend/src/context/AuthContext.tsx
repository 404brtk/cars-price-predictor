'use client';

import React, { createContext, useContext, useEffect, useReducer, useCallback, useMemo, ReactNode } from 'react';
import api, { InternalAxiosRequestConfig } from '@/lib/api';

// Define the shape of the user object and the state
interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Define the actions for the reducer
type AuthAction =
  | { type: 'AUTH_CHECK_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE' }
  | { type: 'LOGOUT' };

// Define the shape of the context
interface AuthContextType extends AuthState {
  login: (userData: User) => void;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Reducer function to manage auth state transitions
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_CHECK_START':
      return { ...state, isLoading: true };
    case 'AUTH_SUCCESS':
      return { ...state, isLoading: false, isAuthenticated: true, user: action.payload };
    case 'AUTH_FAILURE':
    case 'LOGOUT':
      return { ...state, isLoading: false, isAuthenticated: false, user: null };
    default:
      return state;
  }
};

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start in a loading state to perform the initial auth check
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const checkAuthStatus = useCallback(async () => {
    dispatch({ type: 'AUTH_CHECK_START' });
    try {
      const config: InternalAxiosRequestConfig = { _skipAuthRefresh: true };
      const response = await api.get<User>('/users/me/', config);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.data });
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE' });
    }
  }, []);

  const login = useCallback((userData: User) => {
    dispatch({ type: 'AUTH_SUCCESS', payload: userData });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/logout/');
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
      // Redirect to login page to ensure a clean state
      window.location.href = '/login';
    }
  }, []);

  // Effect for the initial authentication check
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Effect to listen for the global logout event from the API interceptor
  useEffect(() => {
    const handleGlobalLogout = () => {
      console.log('Global logout event received. Forcing logout.');
      dispatch({ type: 'LOGOUT' });
    };
    window.addEventListener('logout', handleGlobalLogout);
    return () => window.removeEventListener('logout', handleGlobalLogout);
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    ...state,
    login,
    logout,
    checkAuthStatus,
  }), [state, login, logout, checkAuthStatus]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
