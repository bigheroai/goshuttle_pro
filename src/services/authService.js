import { supabase } from '../lib/supabase';

export const authService = {
  // Get current user session
  async getCurrentUser() {
    try {
      const { data: { session } } = await supabase?.auth?.getSession();
      return session?.user || null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  // Get user profile with company info
  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        ?.from('user_profiles')
        ?.select(`
          *,
          companies (
            id,
            name,
            logo_url
          )
        `)
        ?.eq('id', userId)
        ?.single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  },

  // Update user profile
  async updateUserProfile(userId, updates) {
    try {
      const { data, error } = await supabase
        ?.from('user_profiles')
        ?.update({
          ...updates,
          updated_at: new Date()?.toISOString()
        })
        ?.eq('id', userId)
        ?.select()
        ?.single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Enhanced logout for all user types
  async signOutUser() {
    try {
      // Sign out from Supabase
      const { error } = await supabase?.auth?.signOut();
      
      // Clear all cached data
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (storageError) {
        console.warn('Error clearing storage:', storageError);
      }
      
      if (error) {
        console.warn('Supabase signOut error:', error);
        // Continue with local cleanup even if Supabase fails
      }
      
      return { error: null };
    } catch (error) {
      console.error('SignOut service error:', error);
      // Clear local storage even on error
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (storageError) {
        console.warn('Error clearing storage on error:', storageError);
      }
      
      return { error: error?.message };
    }
  },

  // Check if user session is valid
  async validateSession() {
    try {
      const { data: { session }, error } = await supabase?.auth?.getSession();
      
      if (error || !session) {
        // Clear any stale data if session is invalid
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (storageError) {
          console.warn('Error clearing stale session data:', storageError);
        }
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }
};