import { supabase } from '../lib/supabase';
import { imageStorageService } from './imageStorageService';

/**
 * Partner Storage Service  
 * Handles partner profile images and document uploads
 */
export const partnerStorageService = {
  // Upload partner profile image
  async uploadPartnerImage(partnerId, file, userId) {
    return imageStorageService?.uploadImage('partner', file, userId, {
      folder: `partner-${partnerId}`,
      upsert: true
    });
  },

  // Get partner with fresh image URLs
  async getPartnerWithImages(partnerId) {
    try {
      // Note: Using user_profiles as partners table for this example
      // In a real system, you might have a separate partners table
      const { data: partner, error } = await supabase
        ?.from('user_profiles')
        ?.select('*')
        ?.eq('id', partnerId)
        ?.eq('role', 'corporate_manager')
        ?.single();

      if (error) {
        return { data: null, error: error?.message };
      }

      // If partner has images stored in partner bucket, get fresh signed URLs
      if (partner?.avatar_url && partner?.avatar_url?.includes('partner')) {
        const filePath = `partner-${partnerId}/${partner?.avatar_url?.split('/')?.pop()}`;
        const { data: signedUrl } = await imageStorageService?.getSignedUrl('partner', filePath);
        
        if (signedUrl) {
          partner.avatar_url = signedUrl;
        }
      }

      return { data: partner, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to get partner' };
    }
  },

  // List all partners with fresh image URLs
  async getPartnersWithImages() {
    try {
      const { data: partners, error } = await supabase
        ?.from('user_profiles')
        ?.select('*')
        ?.eq('role', 'corporate_manager')
        ?.order('full_name');

      if (error) {
        return { data: null, error: error?.message };
      }

      // Update image URLs for partners that have them stored in partner bucket
      const partnersWithImages = await Promise.all(
        partners?.map(async (partner) => {
          if (partner?.avatar_url && partner?.avatar_url?.includes('partner')) {
            const filePath = `partner-${partner?.id}/${partner?.avatar_url?.split('/')?.pop()}`;
            const { data: signedUrl } = await imageStorageService?.getSignedUrl('partner', filePath);
            
            if (signedUrl) {
              partner.avatar_url = signedUrl;
            }
          }
          return partner;
        }) || []
      );

      return { data: partnersWithImages, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to get partners' };
    }
  },

  // Delete partner image
  async deletePartnerImage(partnerId) {
    try {
      // Get current partner to find the image path
      const { data: partner } = await this.getPartnerWithImages(partnerId);
      
      if (partner?.avatar_url && partner?.avatar_url?.includes('partner')) {
        // Extract file path and delete from storage
        const filePath = `partner-${partnerId}/${partner?.avatar_url?.split('/')?.pop()}`;
        await imageStorageService?.deleteFile('partner', filePath);
      }

      // Update partner profile to remove avatar URL
      const { data, error } = await supabase
        ?.from('user_profiles')
        ?.update({
          avatar_url: null,
          updated_at: new Date()?.toISOString()
        })
        ?.eq('id', partnerId)
        ?.select()
        ?.single();

      if (error) {
        return { data: null, error: error?.message };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to delete partner image' };
    }
  },

  // Get partner's uploaded assets
  async getPartnerAssets(partnerId) {
    return imageStorageService?.getUserImages('partner', `partner-${partnerId}`);
  },

  // Upload multiple partner documents/images
  async uploadMultiplePartnerAssets(partnerId, files, userId) {
    const results = [];
    
    for (const file of files) {
      try {
        const result = await imageStorageService?.uploadImage('partner', file, userId, {
          folder: `partner-${partnerId}`,
          upsert: true
        });
        
        results?.push({
          file: file?.name,
          success: !result?.error,
          data: result?.data,
          error: result?.error
        });
      } catch (error) {
        results?.push({
          file: file?.name,
          success: false,
          error: 'Upload failed'
        });
      }
    }
    
    return { data: results, error: null };
  }
};