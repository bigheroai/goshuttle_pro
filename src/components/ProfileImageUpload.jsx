import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { User, Upload, X, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { validateProfilePayload } from '../utils/profileService';

/**
 * ProfileImageUpload
 * ------------------
 * Clean, self-contained component for uploading a profile picture to the
 * Supabase "Profiles" storage bucket (public bucket).
 *
 * Upload path: {userId}/{timestamp}.{ext}
 * URL stored:  public URL (never a signed/expiring URL)
 *
 * Props:
 *   currentImageUrl  – current avatar_url from the profile
 *   onUploadSuccess  – called with { url } after DB is updated
 *   onUploadError    – called with error string on failure
 */
const ProfileImageUpload = ({
  currentImageUrl = null,
  onUploadSuccess,
  onUploadError,
}) => {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const fileInputRef = useRef(null);

  const [previewUrl, setPreviewUrl] = useState(currentImageUrl);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ─── helpers ────────────────────────────────────────────────────────────────

  const resetMessages = () => {
    setSuccessMsg('');
    setErrorMsg('');
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    if (onUploadError) onUploadError(msg);
  };

  const animateProgress = () => {
    setProgress(0);
    const steps = [15, 35, 55, 75, 90];
    let i = 0;
    const id = setInterval(() => {
      if (i < steps?.length) {
        setProgress(steps?.[i]);
        i++;
      } else {
        clearInterval(id);
      }
    }, 180);
    return id;
  };

  // ─── main upload handler ─────────────────────────────────────────────────────

  const handleFileChange = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file || !user?.id) return;

    resetMessages();

    // Validate type
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed?.includes(file?.type)) {
      showError('Please select a JPEG, PNG, or WebP image.');
      return;
    }

    // Validate size (5 MB)
    if (file?.size > 5 * 1024 * 1024) {
      showError('Image must be smaller than 5 MB.');
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploading(true);

    const progressId = animateProgress();

    try {
      // ── 1. Verify session is valid immediately before upload ───────────────
      let activeSession = null;

      // Try refreshSession first to get a fresh token
      const { data: refreshData, error: refreshError } = await supabase?.auth?.refreshSession();
      if (!refreshError && refreshData?.session) {
        activeSession = refreshData?.session;
        console.log('[ProfileImageUpload] Session refreshed successfully. Expires at:', new Date(activeSession.expires_at * 1000)?.toISOString());
      } else {
        // refreshSession failed — fall back to getSession
        if (refreshError) {
          console.warn('[ProfileImageUpload] refreshSession error:', refreshError?.message);
        }
        const { data: sessionData, error: sessionError } = await supabase?.auth?.getSession();
        if (sessionError) {
          console.error('[ProfileImageUpload] getSession error:', sessionError?.message);
          throw new Error('Your session has expired. Please log in again.');
        }
        if (!sessionData?.session) {
          console.error('[ProfileImageUpload] getSession returned no session — user is not authenticated.');
          throw new Error('Your session has expired. Please log in again.');
        }
        activeSession = sessionData?.session;
        console.log('[ProfileImageUpload] Using existing session. Expires at:', new Date(activeSession.expires_at * 1000)?.toISOString());
      }

      // Verify the session is not expired
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (activeSession?.expires_at && activeSession?.expires_at < nowSeconds) {
        console.error('[ProfileImageUpload] Session token is expired. expires_at:', activeSession?.expires_at, 'now:', nowSeconds);
        throw new Error('Your session has expired. Please log in again.');
      }

      // Confirm user ID matches
      if (!activeSession?.user?.id) {
        console.error('[ProfileImageUpload] Session has no user.id — aborting upload.');
        throw new Error('Authentication error. Please log in again.');
      }

      console.log('[ProfileImageUpload] Session valid. user.id:', activeSession?.user?.id, 'Proceeding with upload.');

      // ── 2. Build storage path: {userId}/{timestamp}.{ext} ─────────────────
      const ext = file?.name?.split('.')?.pop()?.toLowerCase();
      const fileName = `${Date.now()}.${ext}`;
      const storagePath = `${user?.id}/${fileName}`;

      // ── 3. Upload to Profiles bucket (upsert:false — always a new unique path) ──
      console.log('[ProfileImageUpload] === UPLOAD ATTEMPT ===');
      console.log('[ProfileImageUpload] Bucket: Profiles');
      console.log('[ProfileImageUpload] Storage path:', storagePath);
      console.log('[ProfileImageUpload] File name:', file?.name, '| Type:', file?.type, '| Size:', file?.size, 'bytes');
      console.log('[ProfileImageUpload] Session user.id:', activeSession?.user?.id);
      console.log('[ProfileImageUpload] Session role:', activeSession?.user?.role);
      console.log('[ProfileImageUpload] Session aud:', activeSession?.user?.aud);
      console.log('[ProfileImageUpload] Access token (first 40 chars):', activeSession?.access_token?.substring(0, 40));
      console.log('[ProfileImageUpload] Token expires_at:', activeSession?.expires_at, '| Now:', Math.floor(Date.now() / 1000));

      const { data: uploadData, error: uploadError } = await supabase?.storage?.from('Profiles')?.upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file?.type,
        });

      console.log('[ProfileImageUpload] Upload response data:', uploadData);
      console.log('[ProfileImageUpload] Upload response error:', uploadError);

      if (uploadError) {
        console.error('[ProfileImageUpload] === UPLOAD FAILED ===');
        console.error('[ProfileImageUpload] Error message:', uploadError?.message);
        console.error('[ProfileImageUpload] Error name:', uploadError?.name);
        console.error('[ProfileImageUpload] Error status:', uploadError?.status || uploadError?.statusCode);
        console.error('[ProfileImageUpload] Full error object:', JSON.stringify(uploadError, null, 2));
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('[ProfileImageUpload] === UPLOAD SUCCEEDED ===');

      // ── 4. Get public URL (bucket is public — no signed URL needed) ────────
      const { data: urlData } = supabase?.storage?.from('Profiles')?.getPublicUrl(storagePath);

      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) {
        throw new Error('Could not retrieve public URL after upload.');
      }

      // ── 5. Save public URL to user_profiles ───────────────────────────────
      const { valid, payload, errors: validationErrors } = validateProfilePayload({
        userId: user?.id,
        email: undefined,
        full_name: undefined,
        avatar_url: publicUrl,
        user,
        userProfile,
        session: activeSession,
      });

      if (!valid) {
        throw new Error(`Profile validation failed: ${validationErrors.join(' ')}`);
      }

      const { error: dbError } = await supabase?.from('user_profiles')?.upsert(payload, { onConflict: 'id' });

      if (dbError) {
        console.error('ProfileImageUpload DB save error:', dbError);
        throw new Error(`Profile update failed: ${dbError.message}`);
      }

      // ── 6. Finish up ───────────────────────────────────────────────────────
      clearInterval(progressId);
      setProgress(100);

      // Swap preview from blob URL to real public URL
      URL.revokeObjectURL(localUrl);
      setPreviewUrl(publicUrl);

      // Refresh auth context so AccountHeader picks up the new avatar
      if (refreshUserProfile) await refreshUserProfile();

      // Dispatch events so AccountHeader refreshes
      window.dispatchEvent(new CustomEvent('avatarUpdated', {
        detail: { userId: user.id, avatarUrl: publicUrl, timestamp: Date.now() },
      }));
      window.dispatchEvent(new CustomEvent('profileUpdated', {
        detail: { userId: user.id, timestamp: Date.now() },
      }));
      localStorage.setItem(`profile_updated_${user?.id}`, Date.now()?.toString());

      setSuccessMsg('Profile photo updated!');
      setTimeout(() => setSuccessMsg(''), 4000);

      if (onUploadSuccess) onUploadSuccess({ url: publicUrl, path: storagePath });

    } catch (err) {
      clearInterval(progressId);
      setProgress(0);
      URL.revokeObjectURL(localUrl);
      // Revert preview to previous image on error
      setPreviewUrl(currentImageUrl);
      showError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef?.current) fileInputRef.current.value = '';
    }
  };

  // ─── remove handler ──────────────────────────────────────────────────────────

  const handleRemove = async () => {
    if (!user?.id) return;
    resetMessages();

    try {
      const { error } = await supabase?.from('user_profiles')?.update({ avatar_url: null, updated_at: new Date()?.toISOString() })?.eq('id', user?.id);

      if (error) throw new Error(error.message);

      setPreviewUrl(null);
      if (refreshUserProfile) await refreshUserProfile();

      window.dispatchEvent(new CustomEvent('avatarUpdated', {
        detail: { userId: user.id, avatarUrl: null, timestamp: Date.now() },
      }));
      localStorage.setItem(`profile_updated_${user?.id}`, Date.now()?.toString());

      if (onUploadSuccess) onUploadSuccess({ url: null, path: null });
    } catch (err) {
      showError(err?.message || 'Failed to remove photo.');
    }
  };

  // ─── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />
      {/* Avatar + controls row */}
      <div className="flex items-center gap-4">
        {/* Avatar circle */}
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={() => setPreviewUrl(null)}
              />
            ) : (
              <User className="w-8 h-8 text-gray-400" />
            )}
          </div>

          {/* Progress ring overlay while uploading */}
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black bg-opacity-40 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}

          {/* Remove button */}
          {previewUrl && !uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-sm"
              title="Remove photo"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Upload button + hint */}
        <div className="flex-1">
          <button
            type="button"
            onClick={() => fileInputRef?.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading… {progress > 0 ? `${progress}%` : ''}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {previewUrl ? 'Change Photo' : 'Upload Photo'}
              </>
            )}
          </button>
          <p className="mt-1 text-xs text-gray-500">JPEG, PNG or WebP · max 5 MB</p>
        </div>
      </div>
      {/* Progress bar */}
      {uploading && progress > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {/* Success message */}
      {successMsg && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {/* Error message */}
      {errorMsg && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}
    </div>
  );
};

export default ProfileImageUpload;
