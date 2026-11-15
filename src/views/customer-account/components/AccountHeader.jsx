import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, MapPin, Star, Trophy, Calendar, RefreshCw, Camera } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { profileService } from '../../../utils/profileService';
import { validateProfilePayload } from '../../../utils/profileService';
import { supabase } from '../../../lib/supabase';

const AccountHeader = ({ onProfileRefresh }) => {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageRefreshKey, setImageRefreshKey] = useState(Date.now());
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerUploadError, setBannerUploadError] = useState('');
  const bannerFileInputRef = useRef(null);

  // Enhanced profile loading with improved image URL handling and stability
  const loadProfile = useCallback(async (force = false) => {
    if (!user?.id) return;
    
    if (force) setRefreshing(true);
    else if (!profile) setLoading(true); // Only show loading if no profile exists

    try {
      // Always fetch fresh data when force is true (for image updates)
      if (force || !userProfile) {
        // Get fresh profile data with updated signed URLs
        const { data: profileData, error } = await profileService?.getProfile(user?.id);
        
        if (!error && profileData) {
          setProfile(profileData);
          // Reset image states when loading fresh data
          setImageError(false);
          setImageRefreshKey(Date.now());
          // Refresh the auth context profile
          await refreshUserProfile();
          onProfileRefresh?.(profileData);
        } else {
          console.error('Failed to load profile:', error);
        }
      } else {
        // Use context data but still check for fresh signed URL if needed
        if (userProfile?.avatar_url && userProfile?.avatar_url?.includes('Profiles')) {
          const { data: profileData } = await profileService?.getProfile(user?.id);
          if (profileData?.avatar_url !== userProfile?.avatar_url) {
            setProfile(profileData);
            setImageRefreshKey(Date.now());
          } else {
            setProfile(userProfile);
          }
        } else {
          setProfile(userProfile);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, userProfile, refreshUserProfile, onProfileRefresh, profile]);

  // Load profile when user changes or component mounts
  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]); // Removed loadProfile from dependency to prevent loops

  // Update local state when userProfile context changes - debounced
  useEffect(() => {
    if (userProfile && !loading && !refreshing) {
      const timer = setTimeout(() => {
        // Check if avatar URL has changed
        if (profile?.avatar_url !== userProfile?.avatar_url) {
          setProfile(userProfile);
          setImageRefreshKey(Date.now());
          setImageError(false);
        }
      }, 100); // Small delay to prevent rapid updates
      
      return () => clearTimeout(timer);
    }
  }, [userProfile, loading, refreshing, profile?.avatar_url]);

  // Enhanced event listeners for profile and avatar updates - debounced
  useEffect(() => {
    let updateTimeout;
    
    const handleProfileUpdate = (event) => {
      if (event?.detail?.userId === user?.id) {
        // Debounce profile updates to prevent rapid refreshes
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
          loadProfile(true);
        }, 200);
      }
    };

    const handleAvatarUpdate = (event) => {
      if (event?.detail?.userId === user?.id) {
        // Force refresh and reset image states for avatar updates
        setImageError(false);
        setImageRefreshKey(Date.now());
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
          loadProfile(true);
        }, 200);
      }
    };

    window?.addEventListener('profileUpdated', handleProfileUpdate);
    window?.addEventListener('avatarUpdated', handleAvatarUpdate);

    // Listen for storage events (cross-tab updates)
    const handleStorageChange = (event) => {
      if (event?.key === `profile_updated_${user?.id}`) {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
          loadProfile(true);
        }, 300);
      }
    };
    window?.addEventListener('storage', handleStorageChange);

    return () => {
      clearTimeout(updateTimeout);
      window?.removeEventListener('profileUpdated', handleProfileUpdate);
      window?.removeEventListener('avatarUpdated', handleAvatarUpdate);
      window?.removeEventListener('storage', handleStorageChange);
    };
  }, [user?.id, loadProfile]);

  // Manual refresh handler with debouncing
  const handleRefresh = useCallback(async () => {
    if (refreshing) return; // Prevent multiple simultaneous refreshes
    setImageError(false);
    await loadProfile(true);
  }, [loadProfile, refreshing]);

  // Handle image loading errors with retry logic - debounced
  const handleImageError = useCallback(() => {
    setImageError(true);
    // Try to refresh the signed URL after a short delay, but only once per 5 seconds
    const lastRetry = parseInt(localStorage.getItem(`imageRetry_${user?.id}`) || '0');
    const now = Date.now();
    
    if (now - lastRetry > 5000) { // 5 second cooldown
      localStorage.setItem(`imageRetry_${user?.id}`, now?.toString());
      setTimeout(() => {
        if (user?.id && profile?.avatar_url) {
          loadProfile(true);
        }
      }, 1000);
    }
  }, [user?.id, profile?.avatar_url, loadProfile]);

  // Handle successful image load
  const handleImageLoad = useCallback(() => {
    setImageError(false);
    // Clear retry timestamp on successful load
    localStorage.removeItem(`imageRetry_${user?.id}`);
  }, [user?.id]);

  // Handle banner avatar upload directly from the header
  const handleBannerFileChange = useCallback(async (e) => {
    const file = e?.target?.files?.[0];
    if (!file || !user?.id) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed?.includes(file?.type)) {
      setBannerUploadError('Please select a JPEG, PNG, or WebP image.');
      return;
    }
    if (file?.size > 5 * 1024 * 1024) {
      setBannerUploadError('Image must be smaller than 5 MB.');
      return;
    }

    setBannerUploading(true);
    setBannerUploadError('');

    try {
      const { data: refreshData, error: refreshError } = await supabase?.auth?.refreshSession();
      let activeSession = refreshData?.session;
      if (refreshError || !activeSession) {
        const { data: sessionData } = await supabase?.auth?.getSession();
        activeSession = sessionData?.session;
      }
      if (!activeSession) throw new Error('Session expired. Please log in again.');

      const ext = file?.name?.split('.')?.pop()?.toLowerCase();
      const storagePath = `${user?.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase?.storage?.from('Profiles')?.upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file?.type,
      });
      if (uploadError) throw new Error(`Upload failed: ${uploadError?.message}`);

      const { data: urlData } = supabase?.storage?.from('Profiles')?.getPublicUrl(storagePath);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error('Could not retrieve public URL after upload.');

      const { valid, payload, errors: validationErrors } = validateProfilePayload({
        userId: user?.id,
        email: undefined,
        full_name: undefined,
        avatar_url: publicUrl,
        user,
        userProfile: profile || userProfile,
        session: activeSession,
      });

      if (!valid) {
        throw new Error(`Profile validation failed: ${validationErrors.join(' ')}`);
      }

      const { error: dbError } = await supabase?.from('user_profiles')?.upsert(payload, { onConflict: 'id' });
      if (dbError) throw new Error(`Profile update failed: ${dbError?.message}`);

      if (refreshUserProfile) await refreshUserProfile();
      setImageError(false);
      setImageRefreshKey(Date.now());

      window.dispatchEvent(new CustomEvent('avatarUpdated', {
        detail: { userId: user?.id, avatarUrl: publicUrl, timestamp: Date.now() },
      }));
      window.dispatchEvent(new CustomEvent('profileUpdated', {
        detail: { userId: user?.id, timestamp: Date.now() },
      }));
      localStorage.setItem(`profile_updated_${user?.id}`, Date.now()?.toString());

      await loadProfile(true);
    } catch (err) {
      setBannerUploadError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setBannerUploading(false);
      if (bannerFileInputRef?.current) bannerFileInputRef.current.value = '';
    }
  }, [user?.id, refreshUserProfile, loadProfile]);

  const getTierColor = (tier) => {
    const colors = {
      bronze: 'text-amber-600 bg-amber-100',
      silver: 'text-gray-600 bg-gray-100', 
      gold: 'text-yellow-600 bg-yellow-100',
      platinum: 'text-purple-600 bg-purple-100'
    };
    return colors?.[tier] || colors?.bronze;
  };

  const getTierIcon = (tier) => {
    return <Trophy className="w-4 h-4" />;
  };

  // Stable loading state with fixed dimensions
  if (loading && !profile) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-6" style={{minHeight: '180px'}}>
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full animate-pulse flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-white bg-opacity-20 rounded animate-pulse"></div>
            <div className="h-4 bg-white bg-opacity-20 rounded animate-pulse w-2/3"></div>
            <div className="h-4 bg-white bg-opacity-20 rounded animate-pulse w-1/2"></div>
          </div>
          <div className="w-24 h-16 bg-white bg-opacity-20 rounded animate-pulse flex-shrink-0"></div>
        </div>
      </div>
    );
  }

  // Use the most recent profile data available
  const currentProfile = profile || userProfile;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-6" style={{minHeight: '180px'}}>
      <div className="flex items-center space-x-6">
        {/* Enhanced Profile Picture with Stable Error Handling */}
        <div className="relative flex-shrink-0">
          {/* Hidden file input for banner upload */}
          <input
            ref={bannerFileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleBannerFileChange}
            className="hidden"
            disabled={bannerUploading}
          />
          <div
            className="w-20 h-20 rounded-full bg-white bg-opacity-20 flex items-center justify-center overflow-hidden border-4 border-white border-opacity-30 cursor-pointer group relative"
            onClick={() => !bannerUploading && bannerFileInputRef?.current?.click()}
            title="Click to update profile photo"
          >
            {/* Main Image with Enhanced Loading - prevent layout shift */}
            {currentProfile?.avatar_url && !imageError && (
              <img 
                src={`${currentProfile?.avatar_url}${currentProfile?.avatar_url?.includes('?') ? '&' : '?'}t=${imageRefreshKey}`}
                alt={currentProfile?.full_name || 'Profile'}
                className="w-full h-full object-cover transition-opacity duration-200"
                onError={handleImageError}
                onLoad={handleImageLoad}
                key={`${currentProfile?.avatar_url}-${imageRefreshKey}`}
                style={{ 
                  display: imageError ? 'none' : 'block',
                  opacity: loading ? 0.7 : 1
                }}
              />
            )}
            
            {/* Fallback Icon with stable positioning */}
            <div 
              className={`w-full h-full flex items-center justify-center transition-opacity duration-200 ${
                (currentProfile?.avatar_url && !imageError) ? 'hidden' : 'flex'
              }`}
            >
              <User className="w-8 h-8 text-white text-opacity-80" />
            </div>

            {/* Camera overlay on hover */}
            {!bannerUploading && !refreshing && (
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-full transition-all duration-200">
                <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
            )}

            {/* Loading Indicator for Image - non-disruptive */}
            {(refreshing || bannerUploading) && (
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center rounded-full transition-opacity duration-200">
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              </div>
            )}
          </div>
          
          {/* Camera badge */}
          {!bannerUploading && (
            <button
              type="button"
              onClick={() => bannerFileInputRef?.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors shadow-md border-2 border-white"
              title="Update profile photo"
            >
              <Camera className="w-3 h-3" />
            </button>
          )}

          {/* Membership Tier Badge - stable positioning */}
          <div className={`absolute -top-1 -left-1 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all duration-200 ${getTierColor(currentProfile?.membership_tier)}`}>
            {getTierIcon(currentProfile?.membership_tier)}
            {currentProfile?.membership_tier?.toUpperCase() || 'BRONZE'}
          </div>
        </div>

        {/* User Info - stable layout */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold mb-1 truncate">
            {currentProfile?.full_name || user?.email || 'User'}
          </h1>
          <p className="text-blue-100 mb-2 flex items-center gap-2">
            <User className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              {currentProfile?.role === 'corporate_manager' ? 'Corporate Manager' : 
               currentProfile?.role === 'admin' ? 'Administrator' :
               currentProfile?.role === 'employee' ? 'Employee' : 'Customer'}
            </span>
          </p>
          
          {currentProfile?.department && (
            <p className="text-blue-200 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{currentProfile?.department}</span>
            </p>
          )}
          
          <p className="text-blue-200 text-sm flex items-center gap-2 mt-1">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>Member since {new Date(currentProfile?.created_at || Date.now())?.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long' 
            })}</span>
          </p>
        </div>

        {/* Points Display - stable width */}
        <div className="text-center flex-shrink-0">
          <div className="bg-white bg-opacity-20 rounded-lg p-4 min-w-[120px]">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="w-5 h-5 text-yellow-300 flex-shrink-0" />
              <span className="text-2xl font-bold">{currentProfile?.loyalty_points?.toLocaleString() || '0'}</span>
            </div>
            <p className="text-blue-200 text-sm">Loyalty Points</p>
          </div>
          {bannerUploadError && (
            <p className="mt-2 text-xs text-red-200 max-w-[120px]">{bannerUploadError}</p>
          )}
        </div>

        {/* Enhanced Refresh Button - stable positioning */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh Profile & Image"
          >
            <RefreshCw 
              className={`w-4 h-4 transition-transform duration-200 ${refreshing ? 'animate-spin' : ''}`} 
            />
          </button>
          <div className="h-4 flex items-center justify-center">
            {refreshing && (
              <span className="text-xs text-blue-200">Updating...</span>
            )}
            {imageError && !refreshing && (
              <span className="text-xs text-red-200">Image failed</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountHeader;