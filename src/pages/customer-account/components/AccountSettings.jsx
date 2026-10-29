import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import ProfileImageUpload from '../../../components/ProfileImageUpload';
import { validateProfilePayload } from '../../../utils/profileService';


const AccountSettings = ({ onProfileUpdate }) => {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '', 
    phone: '',
    avatar_url: ''
  });
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // RLS diagnostic test state
  const [rlsTestRunning, setRlsTestRunning] = useState(false);
  const [rlsTestResult, setRlsTestResult] = useState(null); // null | { success: boolean, message: string, detail: string }

  // Load user profile data
  useEffect(() => {
    if (userProfile) {
      setFormData({
        full_name: userProfile?.full_name || '',
        email: userProfile?.email || user?.email || '',
        phone: userProfile?.phone || '',
        avatar_url: userProfile?.avatar_url || ''
      });
      setLoading(false);
    } else if (user) {
      // User is logged in but profile hasn't loaded yet — use auth user data as fallback
      setFormData({
        full_name: user?.user_metadata?.full_name || '',
        email: user?.email || '',
        phone: '',
        avatar_url: ''
      });
      // Give profile a moment to load, then stop waiting
      const timer = setTimeout(() => setLoading(false), 3000);
      return () => clearTimeout(timer);
    } else {
      // No user at all — stop loading
      setLoading(false);
    }
  }, [userProfile, user]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswords(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (uploadResult) => {
    if (uploadResult?.url) {
      setFormData(prev => ({
        ...prev,
        avatar_url: uploadResult?.url
      }));
      setUploadError('');
    } else {
      // Image removed
      setFormData(prev => ({
        ...prev,
        avatar_url: ''
      }));
    }
  };

  const handleImageError = (error) => {
    setUploadError(error);
  };

  const handleUpdateProfile = async (e) => {
    e?.preventDefault();
    
    if (!user) return;

    // --- Centralized NOT NULL validation ---
    const { valid, payload, errors: validationErrs } = validateProfilePayload({
      userId: user?.id,
      email: formData?.email,
      full_name: formData?.full_name,
      avatar_url: formData?.avatar_url,
      user,
      userProfile,
      session: null,
    });

    if (!valid) {
      const errMap = {};
      validationErrs?.forEach((msg, i) => {
        if (msg?.toLowerCase()?.includes('email')) errMap.email = msg;
        else if (msg?.toLowerCase()?.includes('full name')) errMap.full_name = msg;
        else errMap[`err_${i}`] = msg;
      });
      setValidationErrors(errMap);
      setUploadError(validationErrs?.join(' '));
      return;
    }

    setValidationErrors({});
    // --- End validation ---

    try {
      setUpdating(true);
      setUploadError('');
      setProfileSaved(false);

      // Update user profile using validated payload (add phone which is nullable)
      const { data, error } = await supabase?.from('user_profiles')?.update({
          full_name: payload?.full_name,
          email: payload?.email,
          phone: formData?.phone,
          avatar_url: payload?.avatar_url,
          updated_at: payload?.updated_at,
        })?.eq('id', user?.id)?.select()?.single();

      if (error) throw error;

      // Update email if changed (requires Supabase auth update)
      if (payload?.email !== user?.email) {
        const { error: emailError } = await supabase?.auth?.updateUser({
          email: payload?.email
        });

        if (emailError) {
          console.warn('Email update failed:', emailError);
        }
      }

      // Refresh profile data
      if (refreshUserProfile) {
        await refreshUserProfile();
      }

      // Notify parent component
      if (onProfileUpdate) {
        onProfileUpdate(data);
      }

      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 4000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setUploadError(`Failed to update profile: ${error?.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e) => {
    e?.preventDefault();

    if (passwords?.new !== passwords?.confirm) {
      alert('New passwords do not match');
      return;
    }

    if (passwords?.new?.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      setChangingPassword(true);

      // Update password via Supabase auth
      const { error } = await supabase?.auth?.updateUser({
        password: passwords?.new
      });

      if (error) throw error;

      // Clear password fields
      setPasswords({
        current: '',
        new: '',
        confirm: ''
      });

      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 4000);
    } catch (error) {
      console.error('Error changing password:', error);
      alert(`Failed to change password: ${error?.message}`);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRlsTest = async () => {
    setRlsTestRunning(true);
    setRlsTestResult(null);

    console.log('[RLS-TEST] ========== WITH CHECK (true) DIAGNOSTIC TEST ==========');

    try {
      // Step 1: Get/refresh session
      let session = null;
      const { data: refreshData, error: refreshError } = await supabase?.auth?.refreshSession();
      if (!refreshError && refreshData?.session) {
        session = refreshData?.session;
        console.log('[RLS-TEST] Session refreshed. user.id:', session?.user?.id);
      } else {
        const { data: sessionData, error: sessionError } = await supabase?.auth?.getSession();
        if (sessionError || !sessionData?.session) {
          throw new Error('No active session — user is not authenticated.');
        }
        session = sessionData?.session;
        console.log('[RLS-TEST] Using existing session. user.id:', session?.user?.id);
      }

      console.log('[RLS-TEST] Session role:', session?.user?.role);
      console.log('[RLS-TEST] Session aud:', session?.user?.aud);
      console.log('[RLS-TEST] Token prefix:', session?.access_token?.substring(0, 40));
      console.log('[RLS-TEST] expires_at:', session?.expires_at, '| now:', Math.floor(Date.now() / 1000));

      // Step 2: Build a minimal 1×1 transparent PNG blob
      const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const byteChars = atob(base64Png);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars?.length; i++) byteArr[i] = byteChars?.charCodeAt(i);
      const testBlob = new Blob([byteArr], { type: 'image/png' });

      const testPath = `${session?.user?.id}/rls-test-${Date.now()}.png`;
      console.log('[RLS-TEST] Uploading test file to path:', testPath);
      console.log('[RLS-TEST] Blob size:', testBlob?.size, 'bytes | type:', testBlob?.type);

      // Step 3: Attempt upload
      const { data: uploadData, error: uploadError } = await supabase?.storage
        ?.from('Profiles')
        ?.upload(testPath, testBlob, { cacheControl: '3600', upsert: false, contentType: 'image/png' });

      console.log('[RLS-TEST] Upload data:', JSON.stringify(uploadData, null, 2));
      console.log('[RLS-TEST] Upload error:', JSON.stringify(uploadError, null, 2));

      if (uploadError) {
        console.error('[RLS-TEST] ❌ UPLOAD FAILED — WITH CHECK (true) policy did NOT allow the upload.');
        console.error('[RLS-TEST] Error message:', uploadError?.message);
        console.error('[RLS-TEST] Error status:', uploadError?.status || uploadError?.statusCode);
        console.error('[RLS-TEST] CONCLUSION: Issue is EXTERNAL (stale auth session, wrong anon key, or bucket misconfiguration) — the RLS expression is NOT the root cause.');
        setRlsTestResult({
          success: false,
          message: `❌ Upload FAILED even with WITH CHECK (true)`,
          detail: `Error: ${uploadError?.message} (status: ${uploadError?.status || uploadError?.statusCode}). CONCLUSION: Issue is EXTERNAL — auth session, anon key, or bucket config. RLS expression is NOT the root cause.`,
        });
      } else {
        console.log('[RLS-TEST] ✅ UPLOAD SUCCEEDED — WITH CHECK (true) policy allowed the upload.');
        console.log('[RLS-TEST] CONCLUSION: The previous RLS EXPRESSION was the root cause. The policy expression needs to be fixed.');
        // Clean up test file
        await supabase?.storage?.from('Profiles')?.remove([testPath]);
        console.log('[RLS-TEST] Test file cleaned up.');
        setRlsTestResult({
          success: true,
          message: `✅ Upload SUCCEEDED with WITH CHECK (true)`,
          detail: `CONCLUSION: The RLS expression was the root cause of previous failures. The policy expression needs to be corrected (e.g., use auth.uid() = owner or bucket_id = 'Profiles').`,
        });
      }
    } catch (err) {
      console.error('[RLS-TEST] Exception during test:', err?.message);
      setRlsTestResult({
        success: false,
        message: `❌ Test threw an exception`,
        detail: err?.message || 'Unknown error',
      });
    } finally {
      setRlsTestRunning(false);
      console.log('[RLS-TEST] ========== TEST COMPLETE ==========');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <Icon name="Loader2" className="animate-spin mr-2" size={24} />
          <span>Loading account settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="User" size={24} className="text-primary" />
          <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          {/* Profile Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profile Photo
            </label>
            <ProfileImageUpload
              currentImageUrl={formData?.avatar_url || null}
              onUploadSuccess={handleImageUpload}
              onUploadError={handleImageError}
            />
          </div>

          {/* Validation error banner */}
          {Object.keys(validationErrors)?.length > 0 && (
            <div className="flex items-start space-x-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              <Icon name="AlertCircle" size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Please fix the following before saving:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {Object.values(validationErrors)?.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData?.full_name}
                onChange={(e) => handleInputChange('full_name', e?.target?.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData?.email}
                onChange={(e) => {
                  handleInputChange('email', e?.target?.value);
                  if (validationErrors?.email) setValidationErrors(prev => ({ ...prev, email: undefined }));
                }}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                  validationErrors?.email ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter your email"
                required
              />
              {validationErrors?.email && (
                <p className="mt-1 text-xs text-red-600">{validationErrors?.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData?.phone}
                onChange={(e) => handleInputChange('phone', e?.target?.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User ID
              </label>
              <input
                type="text"
                value={user?.id || ''}
                readOnly
                className={`w-full p-3 border rounded-lg bg-gray-50 text-gray-500 font-mono text-xs cursor-not-allowed ${
                  validationErrors?.user_id ? 'border-red-400 bg-red-50' : 'border-gray-200'
                }`}
              />
              {validationErrors?.user_id && (
                <p className="mt-1 text-xs text-red-600">{validationErrors?.user_id}</p>
              )}
            </div>
          </div>

          {uploadError && !Object.keys(validationErrors)?.length && (
            <div className="flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              <Icon name="AlertCircle" size={16} className="text-red-500 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {profileSaved && (
            <div className="flex items-center space-x-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
              <Icon name="CheckCircle" size={16} className="text-green-500 flex-shrink-0" />
              <span className="font-medium">Profile updated successfully!</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={updating}>
              {updating && <Icon name="Loader2" className="animate-spin mr-2" size={16} />}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
      {/* Change Password */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Lock" size={24} className="text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={passwords?.current}
                onChange={(e) => handlePasswordChange('current', e?.target?.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={passwords?.new}
                onChange={(e) => handlePasswordChange('new', e?.target?.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter new password"
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={passwords?.confirm}
                onChange={(e) => handlePasswordChange('confirm', e?.target?.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Confirm new password"
                minLength={6}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={changingPassword || !passwords?.current || !passwords?.new || !passwords?.confirm}
            >
              {changingPassword && <Icon name="Loader2" className="animate-spin mr-2" size={16} />}
              Change Password
            </Button>
          </div>

          {passwordSaved && (
            <div className="flex items-center space-x-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
              <Icon name="CheckCircle" size={16} className="text-green-500 flex-shrink-0" />
              <span className="font-medium">Password changed successfully!</span>
            </div>
          )}
        </form>
      </div>
      {/* Account Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Info" size={24} className="text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <label className="block font-medium text-gray-700 mb-1">User ID</label>
            <p className="text-gray-600 font-mono text-xs">{user?.id}</p>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Member Since</label>
            <p className="text-gray-600">
              {userProfile?.created_at ? new Date(userProfile.created_at)?.toLocaleDateString() : 'Unknown'}
            </p>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Account Status</label>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              userProfile?.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {userProfile?.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Membership Tier</label>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
              userProfile?.membership_tier === 'platinum' ? 'bg-gray-100 text-gray-800' :
              userProfile?.membership_tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
              userProfile?.membership_tier === 'silver'? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-800'
            }`}>
              {userProfile?.membership_tier || 'Bronze'}
            </span>
          </div>
        </div>

        {/* RLS Diagnostic Test */}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="FlaskConical" size={16} className="text-indigo-500" />
            <span className="text-sm font-semibold text-gray-700">Storage RLS Diagnostic</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Tests a minimal upload to the <code className="bg-gray-100 px-1 rounded">Profiles</code> bucket using the current <code className="bg-gray-100 px-1 rounded">WITH CHECK (true)</code> policy. Check browser console for full details.
          </p>
          <button
            type="button"
            onClick={handleRlsTest}
            disabled={rlsTestRunning || !user?.id}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {rlsTestRunning ? (
              <>
                <Icon name="Loader2" size={14} className="animate-spin" />
                Running test…
              </>
            ) : (
              <>
                <Icon name="Play" size={14} />
                Run RLS Upload Test
              </>
            )}
          </button>

          {rlsTestResult && (
            <div className={`mt-3 rounded-lg px-4 py-3 text-sm border ${
              rlsTestResult?.success
                ? 'bg-green-50 border-green-200 text-green-800' :'bg-red-50 border-red-200 text-red-800'
            }`}>
              <p className="font-semibold">{rlsTestResult?.message}</p>
              <p className="mt-1 text-xs opacity-80">{rlsTestResult?.detail}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;