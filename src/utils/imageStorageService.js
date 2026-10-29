import { supabase } from '../lib/supabase';

/**
 * Comprehensive Image Storage Service for All Buckets
 * Handles image upload, download, and management for:
 * - Profiles: User profile pictures
 * - mainbucket: General application assets
 * - company: Company logos and documents
 * - partner: Partner/external assets
 */

export const imageStorageService = {
  // Bucket configurations with size limits and allowed types
  bucketConfig: {
    Profiles: {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      isPrivate: false
    },
    mainbucket: {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
      isPrivate: true
    },
    company: {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'],
      isPrivate: true
    },
    partner: {
      maxSize: 8 * 1024 * 1024, // 8MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      isPrivate: true
    }
  },

  // Validate file before upload
  validateFile(file, bucketName) {
    const config = this.bucketConfig?.[bucketName];
    const errors = [];

    if (!file) {
      errors?.push('Please select a file');
      return { isValid: false, errors };
    }

    if (!config) {
      errors?.push(`Invalid bucket: ${bucketName}`);
      return { isValid: false, errors };
    }

    if (file?.size > config?.maxSize) {
      const maxMB = config?.maxSize / (1024 * 1024);
      errors?.push(`File size must be less than ${maxMB}MB`);
    }

    if (!config?.allowedTypes?.includes(file?.type)) {
      errors?.push(`File must be one of: ${config?.allowedTypes?.join(', ')}`);
    }

    return { isValid: errors?.length === 0, errors };
  },

  // Generate unique filename with folder structure
  generateFileName(userId, file, folder = '') {
    const fileExt = file?.name?.split('.')?.pop()?.toLowerCase();
    const timestamp = Date.now();
    const baseName = `${userId}-${timestamp}.${fileExt}`;
    
    return folder ? `${folder}/${baseName}` : baseName;
  },

  // Upload image to specified bucket
  async uploadImage(bucketName, file, userId, options = {}) {
    try {
      // Validate file
      const validation = this.validateFile(file, bucketName);
      if (!validation?.isValid) {
        return { data: null, error: validation?.errors?.join(', ') };
      }

      // Generate filename with optional folder structure
      const fileName = this.generateFileName(userId, file, options?.folder);

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase?.storage
        ?.from(bucketName)
        ?.upload(fileName, file, {
          upsert: options?.upsert || true,
          contentType: file?.type
        });

      if (uploadError) {
        return { data: null, error: uploadError?.message };
      }

      // For private buckets, create signed URL
      const config = this.bucketConfig?.[bucketName];
      if (config?.isPrivate) {
        const { data: urlData, error: urlError } = await supabase?.storage
          ?.from(bucketName)
          ?.createSignedUrl(fileName, 3600); // 1 hour expiry

        if (urlError) {
          return { data: null, error: urlError?.message };
        }

        return {
          data: {
            path: fileName,
            signedUrl: urlData?.signedUrl,
            bucket: bucketName,
            fullPath: `${bucketName}/${fileName}`
          },
          error: null
        };
      }

      // For public buckets, get public URL
      const { data: publicUrlData } = supabase?.storage
        ?.from(bucketName)
        ?.getPublicUrl(fileName);

      return {
        data: {
          path: fileName,
          publicUrl: publicUrlData?.publicUrl,
          bucket: bucketName,
          fullPath: `${bucketName}/${fileName}`
        },
        error: null
      };
    } catch (error) {
      return { data: null, error: 'Failed to upload image' };
    }
  },

  // Get signed URL for private bucket file
  async getSignedUrl(bucketName, filePath, expirySeconds = 3600) {
    try {
      const { data, error } = await supabase?.storage
        ?.from(bucketName)
        ?.createSignedUrl(filePath, expirySeconds);

      if (error) {
        return { data: null, error: error?.message };
      }

      return { data: data?.signedUrl, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to get signed URL' };
    }
  },

  // List files in bucket folder
  async listFiles(bucketName, folder = '', options = {}) {
    try {
      const { data: files, error: listError } = await supabase?.storage
        ?.from(bucketName)
        ?.list(folder, {
          limit: options?.limit || 100,
          offset: options?.offset || 0,
          sortBy: { column: 'name', order: 'asc' },
          ...options
        });

      if (listError) {
        return { data: null, error: listError?.message };
      }

      // For private buckets, generate signed URLs
      const config = this.bucketConfig?.[bucketName];
      if (config?.isPrivate) {
        const filesWithUrls = await Promise.all(
          files?.map(async (file) => {
            const fullPath = folder ? `${folder}/${file?.name}` : file?.name;
            const { data: urlData } = await supabase?.storage
              ?.from(bucketName)
              ?.createSignedUrl(fullPath, 3600);

            return {
              ...file,
              fullPath,
              signedUrl: urlData?.signedUrl
            };
          }) || []
        );

        return { data: filesWithUrls?.filter(f => f?.signedUrl), error: null };
      }

      // For public buckets, add public URLs
      const filesWithUrls = files?.map(file => {
        const fullPath = folder ? `${folder}/${file?.name}` : file?.name;
        const { data: publicUrlData } = supabase?.storage
          ?.from(bucketName)
          ?.getPublicUrl(fullPath);

        return {
          ...file,
          fullPath,
          publicUrl: publicUrlData?.publicUrl
        };
      }) || [];

      return { data: filesWithUrls, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to list files' };
    }
  },

  // Delete file from bucket
  async deleteFile(bucketName, filePath) {
    try {
      const { error } = await supabase?.storage
        ?.from(bucketName)
        ?.remove([filePath]);

      if (error) {
        return { error: error?.message };
      }

      return { error: null };
    } catch (error) {
      return { error: 'Failed to delete file' };
    }
  },

  // Update profile picture (shortcut for Profiles bucket)
  async updateProfilePicture(userId, file) {
    const result = await this.uploadImage('Profiles', file, userId, {
      folder: userId,
      upsert: true
    });

    if (result?.error) {
      return result;
    }

    // Update user profile with new avatar URL
    try {
      const { data: profileData, error: profileError } = await supabase
        ?.from('user_profiles')
        ?.update({
          avatar_url: result?.data?.signedUrl,
          updated_at: new Date()?.toISOString()
        })
        ?.eq('id', userId)
        ?.select()
        ?.single();

      if (profileError) {
        return { data: null, error: profileError?.message };
      }

      return {
        data: {
          ...profileData,
          imageData: result?.data
        },
        error: null
      };
    } catch (error) {
      return { data: null, error: 'Failed to update profile' };
    }
  },

  // Update company logo (shortcut for company bucket)
  async updateCompanyLogo(companyId, file, userId) {
    const result = await this.uploadImage('company', file, userId, {
      folder: `company-${companyId}`,
      upsert: true
    });

    if (result?.error) {
      return result;
    }

    // Update company with new logo URL
    try {
      const { data: companyData, error: companyError } = await supabase
        ?.from('companies')
        ?.update({
          logo_url: result?.data?.signedUrl,
          updated_at: new Date()?.toISOString()
        })
        ?.eq('id', companyId)
        ?.select()
        ?.single();

      if (companyError) {
        return { data: null, error: companyError?.message };
      }

      return {
        data: {
          ...companyData,
          imageData: result?.data
        },
        error: null
      };
    } catch (error) {
      return { data: null, error: 'Failed to update company logo' };
    }
  },

  // Update vehicle image (shortcut for mainbucket)
  async updateVehicleImage(vehicleId, file, userId) {
    const result = await this.uploadImage('mainbucket', file, userId, {
      folder: `vehicles/${vehicleId}`,
      upsert: true
    });

    if (result?.error) {
      return result;
    }

    // Update vehicle with new image URL
    try {
      const { data: vehicleData, error: vehicleError } = await supabase
        ?.from('vehicles')
        ?.update({
          image_url: result?.data?.signedUrl,
          updated_at: new Date()?.toISOString()
        })
        ?.eq('id', vehicleId)
        ?.select()
        ?.single();

      if (vehicleError) {
        return { data: null, error: vehicleError?.message };
      }

      return {
        data: {
          ...vehicleData,
          imageData: result?.data
        },
        error: null
      };
    } catch (error) {
      return { data: null, error: 'Failed to update vehicle image' };
    }
  },

  // Get user's images from specific bucket
  async getUserImages(bucketName, userId, folder = '') {
    const userFolder = folder || userId;
    return this.listFiles(bucketName, userFolder);
  },

  // Download file from private bucket
  async downloadFile(bucketName, filePath) {
    try {
      const { data, error } = await supabase?.storage
        ?.from(bucketName)
        ?.download(filePath);

      if (error) {
        return { data: null, error: error?.message };
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filePath?.split('/')?.pop();
      document.body?.appendChild(link);
      link?.click();
      document.body?.removeChild(link);
      URL.revokeObjectURL(url);

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to download file' };
    }
  }
};