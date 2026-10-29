import { supabase } from '../lib/supabase';
import { imageStorageService } from './imageStorageService';

/**
 * validateProfilePayload
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized validation layer for user_profiles upsert/update operations.
 * Enforces all NOT NULL constraints (email, full_name, avatar_url) before any
 * Supabase write to eliminate constraint errors at the source.
 *
 * @param {object} opts
 * @param {string}  opts.userId          - auth user id (required)
 * @param {string}  [opts.email]         - preferred email value
 * @param {string}  [opts.full_name]     - preferred full_name value
 * @param {string}  [opts.avatar_url]    - preferred avatar_url value
 * @param {object}  [opts.user]          - Supabase auth user object (fallback source)
 * @param {object}  [opts.userProfile]   - existing DB profile row (fallback source)
 * @param {object}  [opts.session]       - active Supabase session (fallback source)
 * @returns {{ valid: boolean, payload: object, errors: string[] }}
 */
export function validateProfilePayload({ userId, email, full_name, avatar_url, user, userProfile, session } = {}) {
  const errors = [];

  // ── Resolve email ──────────────────────────────────────────────────────────
  const resolvedEmail = (
    email?.trim() ||
    userProfile?.email?.trim() ||
    user?.email?.trim() ||
    session?.user?.email?.trim() ||
    ''
  );
  if (!resolvedEmail) {
    errors?.push('Email is required and cannot be empty.');
  }

  // ── Resolve full_name ──────────────────────────────────────────────────────
  const resolvedFullName = (
    full_name?.trim() ||
    userProfile?.full_name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    session?.user?.user_metadata?.full_name?.trim() ||
    resolvedEmail?.split('@')?.[0] ||
    ''
  );
  if (!resolvedFullName) {
    errors?.push('Full name is required and cannot be empty.');
  }

  // ── Resolve avatar_url ─────────────────────────────────────────────────────
  // avatar_url is NOT NULL in the DB but accepts empty string as a safe default.
  const resolvedAvatarUrl = (
    avatar_url !== undefined ? avatar_url :
    userProfile?.avatar_url !== undefined ? userProfile?.avatar_url :
    '' ) ??'';

  const payload = {
    id: userId,
    email: resolvedEmail,
    full_name: resolvedFullName,
    avatar_url: resolvedAvatarUrl,
    updated_at: new Date()?.toISOString(),
  };

  return {
    valid: errors?.length === 0,
    payload,
    errors,
  };
}

export const profileService = {
  // Update user profile information
  async updateProfile(userId, profileData) {
    try {
      const { data, error } = await supabase
        ?.from('user_profiles')
        ?.update({
          full_name: profileData?.full_name,
          phone: profileData?.phone,
          department: profileData?.department,
          updated_at: new Date()?.toISOString()
        })
        ?.eq('id', userId)
        ?.select()
        ?.single();

      if (error) {
        return { data: null, error: error?.message };
      }

      // Dispatch profile update event
      const profileUpdateEvent = new CustomEvent('profileUpdated', {
        detail: { 
          userId,
          profile: data 
        }
      });
      window?.dispatchEvent(profileUpdateEvent);

      // Cross-tab storage event
      localStorage?.setItem(`profile_updated_${userId}`, Date.now()?.toString());

      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to update profile' };
    }
  },

  // Validate profile picture file
  validateProfilePicture(file) {
    return imageStorageService?.validateFile(file, 'Profiles');
  },

  // Enhanced profile picture upload with better URL handling
  async uploadProfilePicture(userId, file) {
    try {
      // Use the comprehensive image storage service
      const result = await imageStorageService?.updateProfilePicture(userId, file);
      
      if (result?.error) {
        return { data: null, error: result?.error };
      }

      // Ensure we have the correct signed URL
      const avatarUrl = result?.data?.imageData?.signedUrl || result?.data?.avatar_url;

      // Return the profile data with the fresh signed URL
      const profileData = {
        ...result?.data,
        avatar_url: avatarUrl
      };

      // Dispatch avatar update event with more details
      const avatarUpdateEvent = new CustomEvent('avatarUpdated', {
        detail: { 
          userId,
          profile: profileData,
          imageData: result?.data?.imageData,
          timestamp: Date.now()
        }
      });
      window?.dispatchEvent(avatarUpdateEvent);

      // Cross-tab storage event for avatar updates
      localStorage?.setItem(`profile_updated_${userId}`, Date.now()?.toString());

      return {
        data: profileData,
        error: null
      };
    } catch (error) {
      return { data: null, error: 'Failed to upload profile picture' };
    }
  },

  // Enhanced profile retrieval with improved signed URL generation
  async getProfile(userId) {
    try {
      const { data: profile, error } = await supabase
        ?.from('user_profiles')
        ?.select('*')
        ?.eq('id', userId)
        ?.single();

      if (error) {
        return { data: null, error: error?.message };
      }

      // Enhanced signed URL handling for avatar images
      if (profile?.avatar_url) {
        // Check if it's already a signed URL (contains signature)
        if (profile?.avatar_url?.includes('Profiles') && !profile?.avatar_url?.includes('X-Amz-Signature')) {
          // Extract the correct file path
          let filePath;
          
          // Handle different URL formats
          if (profile?.avatar_url?.includes(`${userId}/`)) {
            // Extract path after the userId folder
            const pathParts = profile?.avatar_url?.split(`${userId}/`);
            if (pathParts?.length > 1) {
              filePath = `${userId}/${pathParts?.[1]?.split('?')?.[0]}`;
            }
          } else {
            // Try to extract filename from URL
            const urlPath = profile?.avatar_url?.split('/')?.pop()?.split('?')?.[0];
            filePath = `${userId}/${urlPath}`;
          }
          
          if (filePath) {
            const { data: signedUrl, error: urlError } = await imageStorageService?.getSignedUrl('Profiles', filePath, 7200); // 2 hour expiry
            
            if (!urlError && signedUrl) {
              profile.avatar_url = signedUrl;
            }
          }
        } else if (profile?.avatar_url?.includes('X-Amz-Signature')) {
          // Check if existing signed URL is close to expiry (refresh if older than 30 minutes)
          const urlParams = new URLSearchParams(profile?.avatar_url?.split('?')[1]);
          const expiresParam = urlParams?.get('X-Amz-Expires');
          const dateParam = urlParams?.get('X-Amz-Date');
          
          if (expiresParam && dateParam) {
            const urlDate = new Date(dateParam?.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z'));
            const expiryTime = urlDate?.getTime() + (parseInt(expiresParam) * 1000);
            const now = Date.now();
            const timeUntilExpiry = expiryTime - now;
            
            // Refresh if expires in less than 30 minutes
            if (timeUntilExpiry < 30 * 60 * 1000) {
              // Try to extract the file path and generate fresh URL
              const pathMatch = profile?.avatar_url?.match(/Profiles\/([^?]+)/);
              if (pathMatch?.[1]) {
                const { data: freshUrl } = await imageStorageService?.getSignedUrl('Profiles', pathMatch?.[1], 7200);
                if (freshUrl) {
                  profile.avatar_url = freshUrl;
                }
              }
            }
          }
        }
      }

      return { data: profile, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to get profile' };
    }
  },

  // Get user's uploaded images
  async getUserImages(userId) {
    return imageStorageService?.getUserImages('Profiles', userId);
  },

  // Enhanced profile picture deletion
  async deleteProfilePicture(userId) {
    try {
      // Get current profile to find the image path
      const { data: profile } = await this.getProfile(userId);
      
      if (profile?.avatar_url && profile?.avatar_url?.includes('Profiles')) {
        // Extract file path from signed URL or path
        let filePath;
        const pathMatch = profile?.avatar_url?.match(/Profiles\/([^?]+)/);
        if (pathMatch?.[1]) {
          filePath = pathMatch?.[1];
        }
        
        if (filePath) {
          await imageStorageService?.deleteFile('Profiles', filePath);
        }
      }

      // Update profile to remove avatar URL
      const { data, error } = await supabase
        ?.from('user_profiles')
        ?.update({
          avatar_url: null,
          updated_at: new Date()?.toISOString()
        })
        ?.eq('id', userId)
        ?.select()
        ?.single();

      if (error) {
        return { data: null, error: error?.message };
      }

      // Dispatch avatar update event
      const avatarUpdateEvent = new CustomEvent('avatarUpdated', {
        detail: { 
          userId,
          profile: data,
          deleted: true,
          timestamp: Date.now()
        }
      });
      window?.dispatchEvent(avatarUpdateEvent);

      // Cross-tab storage event
      localStorage?.setItem(`profile_updated_${userId}`, Date.now()?.toString());

      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to delete profile picture' };
    }
  },

  // Update user password
  async updatePassword(newPassword) {
    try {
      const { error } = await supabase?.auth?.updateUser({
        password: newPassword
      });

      if (error) {
        return { error: error?.message };
      }

      return { error: null };
    } catch (error) {
      return { error: 'Failed to update password' };
    }
  },

  // Update user email (requires confirmation)
  async updateEmail(newEmail) {
    try {
      const { error } = await supabase?.auth?.updateUser({
        email: newEmail
      });

      if (error) {
        return { error: error?.message };
      }

      return { error: null };
    } catch (error) {
      return { error: 'Failed to update email' };
    }
  }
};