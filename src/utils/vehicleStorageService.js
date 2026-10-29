import { supabase } from '../lib/supabase';
import { imageStorageService } from './imageStorageService';

/**
 * Vehicle Storage Service  
 * Handles vehicle image uploads and management
 */
export const vehicleStorageService = {
  // Upload vehicle image
  async uploadVehicleImage(vehicleId, file, userId) {
    return imageStorageService?.updateVehicleImage(vehicleId, file, userId);
  },

  // Get vehicle with fresh image URL
  async getVehicleWithImage(vehicleId) {
    try {
      const { data: vehicle, error } = await supabase
        ?.from('vehicles')
        ?.select('*')
        ?.eq('id', vehicleId)
        ?.single();

      if (error) {
        return { data: null, error: error?.message };
      }

      // If vehicle has an image stored in our bucket, get fresh signed URL
      if (vehicle?.image_url && vehicle?.image_url?.includes('mainbucket')) {
        const filePath = `vehicles/${vehicleId}/${vehicle?.image_url?.split('/')?.pop()}`;
        const { data: signedUrl } = await imageStorageService?.getSignedUrl('mainbucket', filePath);
        
        if (signedUrl) {
          vehicle.image_url = signedUrl;
        }
      }

      return { data: vehicle, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to get vehicle' };
    }
  },

  // List all vehicles with fresh image URLs
  async getVehiclesWithImages() {
    try {
      const { data: vehicles, error } = await supabase
        ?.from('vehicles')
        ?.select('*')
        ?.order('name');

      if (error) {
        return { data: null, error: error?.message };
      }

      // Update image URLs for vehicles that have them stored in our bucket
      const vehiclesWithImages = await Promise.all(
        vehicles?.map(async (vehicle) => {
          if (vehicle?.image_url && vehicle?.image_url?.includes('mainbucket')) {
            const filePath = `vehicles/${vehicle?.id}/${vehicle?.image_url?.split('/')?.pop()}`;
            const { data: signedUrl } = await imageStorageService?.getSignedUrl('mainbucket', filePath);
            
            if (signedUrl) {
              vehicle.image_url = signedUrl;
            }
          }
          return vehicle;
        }) || []
      );

      return { data: vehiclesWithImages, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to get vehicles' };
    }
  },

  // Delete vehicle image
  async deleteVehicleImage(vehicleId) {
    try {
      // Get current vehicle to find the image path
      const { data: vehicle } = await this.getVehicleWithImage(vehicleId);
      
      if (vehicle?.image_url && vehicle?.image_url?.includes('mainbucket')) {
        // Extract file path and delete from storage
        const filePath = `vehicles/${vehicleId}/${vehicle?.image_url?.split('/')?.pop()}`;
        await imageStorageService?.deleteFile('mainbucket', filePath);
      }

      // Update vehicle to remove image URL
      const { data, error } = await supabase
        ?.from('vehicles')
        ?.update({
          image_url: null,
          updated_at: new Date()?.toISOString()
        })
        ?.eq('id', vehicleId)
        ?.select()
        ?.single();

      if (error) {
        return { data: null, error: error?.message };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to delete vehicle image' };
    }
  },

  // Get vehicle's uploaded images
  async getVehicleAssets(vehicleId) {
    return imageStorageService?.getUserImages('mainbucket', `vehicles/${vehicleId}`);
  },

  // Upload multiple vehicle images
  async uploadMultipleVehicleImages(vehicleId, files, userId) {
    const results = [];
    
    for (const file of files) {
      try {
        const result = await imageStorageService?.uploadImage('mainbucket', file, userId, {
          folder: `vehicles/${vehicleId}`,
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
  },

  // Get all vehicle images for admin management
  async getAllVehicleAssets() {
    return imageStorageService?.listFiles('mainbucket', 'vehicles');
  }
};