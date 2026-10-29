import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Icon from './AppIcon';
import Button from './ui/Button';

const ImageUpload = ({ 
  bucketName = 'Profiles', 
  folder = 'avatars',
  maxSize = 5242880, // 5MB default
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  onUploadSuccess,
  onUploadError,
  currentImageUrl = null,
  className = "",
  showPreview = true,
  isCircular = false
}) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl);
  const [successNotification, setSuccessNotification] = useState(false);
  const [newlyUploadedUrl, setNewlyUploadedUrl] = useState(null);
  const fileInputRef = useRef(null);
  const notificationTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (notificationTimerRef?.current) clearTimeout(notificationTimerRef?.current);
    };
  }, []);

  const simulateProgress = (onComplete) => {
    setUploadProgress(0);
    const stages = [10, 25, 45, 65, 80, 90];
    let stageIndex = 0;
    const interval = setInterval(() => {
      if (stageIndex < stages?.length) {
        setUploadProgress(stages?.[stageIndex]);
        stageIndex++;
      } else {
        clearInterval(interval);
        onComplete();
      }
    }, 200);
    return interval;
  };

  const handleFileSelect = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!acceptedTypes?.includes(file?.type)) {
      const error = `Please select a valid image file (${acceptedTypes?.map(type => type?.split('/')?.[1])?.join(', ')})`;
      if (onUploadError) onUploadError(error);
      return;
    }

    // Validate file size
    if (file?.size > maxSize) {
      const error = `File size must be less than ${(maxSize / 1024 / 1024)?.toFixed(1)}MB`;
      if (onUploadError) onUploadError(error);
      return;
    }

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setNewlyUploadedUrl(null);

    try {
      setUploading(true);
      setUploadProgress(0);
      setSuccessNotification(false);

      // Verify session is valid before attempting upload
      const { data: sessionData, error: sessionError } = await supabase?.auth?.getSession();
      if (sessionError || !sessionData?.session) {
        console.error('Session check failed:', sessionError);
        if (onUploadError) onUploadError('Your session has expired. Please log in again.');
        return;
      }

      // Build file path — userId as the top-level folder
      const fileExt = file?.name?.split('.')?.pop()?.toLowerCase();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      console.log('Uploading to bucket:', bucketName, 'path:', filePath);

      // Start progress simulation
      let progressInterval;
      const progressPromise = new Promise((resolve) => {
        progressInterval = simulateProgress(resolve);
      });

      // Upload the file
      const uploadPromise = supabase?.storage?.from(bucketName)?.upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

      // Run both in parallel — progress animates while upload happens
      const [, uploadResult] = await Promise.all([progressPromise, uploadPromise]);
      const { data, error } = uploadResult;

      clearInterval(progressInterval);

      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }

      console.log('Upload successful:', data);

      // Animate to 100%
      setUploadProgress(100);

      // Get public URL (Profiles bucket is public)
      const { data: publicUrlData } = supabase?.storage?.from(bucketName)?.getPublicUrl(filePath);
      const imageUrl = publicUrlData?.publicUrl;

      // Short delay so user sees 100% before transitioning
      await new Promise((r) => setTimeout(r, 400));

      // Update preview with the real URL
      setPreviewUrl(imageUrl);
      setNewlyUploadedUrl(imageUrl);
      setSuccessNotification(true);

      // Auto-dismiss success notification after 4 seconds
      if (notificationTimerRef?.current) clearTimeout(notificationTimerRef?.current);
      notificationTimerRef.current = setTimeout(() => {
        setSuccessNotification(false);
      }, 4000);

      if (onUploadSuccess) {
        onUploadSuccess({
          path: filePath,
          url: imageUrl,
          fileName: fileName
        });
      }

    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(0);
      if (onUploadError) {
        onUploadError(error?.message || 'Failed to upload image');
      }
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localPreview);
      if (fileInputRef?.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    try {
      setPreviewUrl(null);
      setNewlyUploadedUrl(null);
      setSuccessNotification(false);
      if (onUploadSuccess) {
        onUploadSuccess({ path: null, url: null, fileName: null });
      }
    } catch (error) {
      console.error('Remove image error:', error);
      if (onUploadError) onUploadError('Failed to remove image');
    }
  };

  const triggerFileSelect = () => {
    fileInputRef?.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes?.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading || !user}
      />

      {/* Success Notification */}
      {successNotification && (
        <div className="flex items-center space-x-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm animate-pulse">
          <Icon name="CheckCircle" size={16} className="text-green-500 flex-shrink-0" />
          <span className="font-medium">Profile image uploaded successfully!</span>
          <button
            onClick={() => setSuccessNotification(false)}
            className="ml-auto text-green-500 hover:text-green-700 transition-colors"
          >
            <Icon name="X" size={14} />
          </button>
        </div>
      )}

      {showPreview && (
        <div className="flex items-center space-x-4">
          <div className={`relative ${isCircular ? 'w-20 h-20' : 'w-24 h-24'}`}>
            {previewUrl ? (
              <>
                <img
                  src={previewUrl}
                  alt="Profile preview"
                  className={`w-full h-full object-cover border-2 ${
                    newlyUploadedUrl === previewUrl ? 'border-green-400' : 'border-gray-200'
                  } ${isCircular ? 'rounded-full' : 'rounded-lg'} transition-all duration-300`}
                  onError={() => setPreviewUrl(null)}
                />
                {/* Green checkmark badge on newly uploaded image */}
                {newlyUploadedUrl === previewUrl && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                    <Icon name="Check" size={12} className="text-white" />
                  </div>
                )}
              </>
            ) : (
              <div className={`w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center ${
                isCircular ? 'rounded-full' : 'rounded-lg'
              }`}>
                <Icon name="User" size={24} className="text-gray-400" />
              </div>
            )}
            {previewUrl && !uploading && (
              <button
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                disabled={uploading}
              >
                <Icon name="X" size={14} />
              </button>
            )}
          </div>
          <div className="flex-1">
            <Button
              variant="outline"
              onClick={triggerFileSelect}
              disabled={uploading || !user}
              className="mb-2"
            >
              {uploading && <Icon name="Loader2" className="animate-spin mr-2" size={16} />}
              {uploading ? 'Uploading...' : previewUrl ? 'Change Image' : 'Upload Image'}
            </Button>
            <div className="text-xs text-gray-500">
              <div>Max size: {(maxSize / 1024 / 1024)?.toFixed(1)}MB</div>
              <div>Formats: {acceptedTypes?.map(type => type?.split('/')?.[1]?.toUpperCase())?.join(', ')}</div>
            </div>
          </div>
        </div>
      )}

      {!showPreview && (
        <Button
          variant="outline"
          onClick={triggerFileSelect}
          disabled={uploading || !user}
        >
          {uploading && <Icon name="Loader2" className="animate-spin mr-2" size={16} />}
          {uploading ? 'Uploading...' : 'Select Image'}
        </Button>
      )}

      {/* Upload Progress Bar */}
      {uploading && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center space-x-1.5">
              <Icon name="Upload" size={13} />
              <span>Uploading image...</span>
            </div>
            <span className="font-medium">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;