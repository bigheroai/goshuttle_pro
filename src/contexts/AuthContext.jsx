import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // ✅ REQUIRED: Separate async operations object
  const profileOperations = {
    async load(userId) {
      if (!userId) return;
      setProfileLoading(true);
      try {
        const { data, error } = await supabase
          ?.from('user_profiles')
          ?.select(`
            id,
            email,
            full_name,
            phone,
            department,
            avatar_url,
            role,
            loyalty_points,
            membership_tier,
            points_lifetime,
            tier_updated_at,
            company_id,
            is_active,
            created_at,
            updated_at
          `)
          ?.eq('id', userId)
          ?.single();
        
        if (!error && data) {
          setUserProfile(data);
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        setProfileLoading(false);
      }
    },
    
    clear() {
      setUserProfile(null);
      setProfileLoading(false);
    }
  };

  // ✅ REQUIRED: Protected auth handlers
  const authStateHandlers = {
    // CRITICAL: This MUST remain synchronous
    onChange: (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        profileOperations?.load(session?.user?.id); // Fire-and-forget
      } else {
        profileOperations?.clear();
      }
    }
  };

  // Enhanced refresh function for profile updates
  const refreshUserProfile = async () => {
    if (user?.id) {
      await profileOperations?.load(user?.id);
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase?.auth?.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error?.message?.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        }
        if (error?.message?.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the confirmation link before signing in.');
        }
        throw new Error(error?.message || 'Failed to sign in');
      }

      return { user: data?.user, error: null };
    } catch (error) {
      return { user: null, error: error?.message };
    }
  };

  const signUp = async (email, password, userData = {}) => {
    try {
      const { data, error } = await supabase?.auth?.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData?.full_name || userData?.name || '',
            role: userData?.role || 'customer'
          }
        }
      });

      if (error) {
        if (error?.message?.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }
        throw new Error(error?.message || 'Failed to create account');
      }

      // Check if email confirmation is required
      // Supabase returns user with identities=[] when email already exists (unconfirmed)
      if (data?.user && !data?.user?.email_confirmed_at && data?.user?.identities?.length === 0) {
        throw new Error('An account with this email already exists but is not confirmed. Please check your email for a confirmation link.');
      }

      return { user: data?.user, error: null };
    } catch (error) {
      return { user: null, error: error?.message };
    }
  };

  const signOut = async () => {
    try {
      // Clear local state first to prevent UI flickering
      setUser(null);
      setUserProfile(null);
      setLoading(false);
      profileOperations?.clear();
      
      // Sign out from Supabase
      const { error } = await supabase?.auth?.signOut();
      
      // Clear any cached data in localStorage
      try {
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('sb-' + supabase?.supabaseUrl?.split('//')?.[1]?.split('.')?.[0] + '-auth-token');
        // Clear any other cached user data
        Object.keys(localStorage)?.forEach(key => {
          if (key?.includes('auth') || key?.includes('user') || key?.includes('profile')) {
            localStorage.removeItem(key);
          }
        });
      } catch (storageError) {
        console.warn('Error clearing localStorage:', storageError);
      }
      
      // Clear sessionStorage as well
      try {
        sessionStorage.clear();
      } catch (sessionError) {
        console.warn('Error clearing sessionStorage:', sessionError);
      }
      
      if (error) {
        console.warn('Supabase signOut error:', error);
        // Even if Supabase signOut fails, we've cleared local state
        // This ensures users can still "logout" from the UI perspective
      }
      
      return { error: null };
    } catch (error) {
      console.error('SignOut error:', error);
      // Ensure local state is cleared even if there's an error
      setUser(null);
      setUserProfile(null);
      setLoading(false);
      profileOperations?.clear();
      
      return { error: error?.message };
    }
  };

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase?.auth?.resetPasswordForEmail(email, {
        redirectTo: `${window?.location?.origin}/auth/reset-password`
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error?.message };
    }
  };

  const updatePassword = async (password) => {
    try {
      const { error } = await supabase?.auth?.updateUser({ password });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error?.message };
    }
  };

  useEffect(() => {
    // Get initial session
    supabase?.auth?.getSession()?.then(({ data: { session } }) => {
      authStateHandlers?.onChange(null, session);
    });

    // PROTECTED: Never modify this callback signature
    const { data: { subscription } } = supabase?.auth?.onAuthStateChange(
      authStateHandlers?.onChange
    );

    return () => subscription?.unsubscribe?.();
  }, []);

  const value = {
    user,
    userProfile,
    loading,
    profileLoading,
    isAuthenticated: !!user,
    isAdmin: userProfile?.role === 'admin',
    isCorporateManager: userProfile?.role === 'corporate_manager',
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;