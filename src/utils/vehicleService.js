import { supabase } from '../lib/supabase';

/**
 * Vehicle service for handling all vehicle-related operations
 * Converts between database snake_case and React camelCase
 */
export const vehicleService = {
  /**
   * Get all vehicles (admin gets all, users get only active)
   */
  async getAll() {
    try {
      const { data, error } = await supabase?.from('vehicles')?.select('*')?.order('created_at', { ascending: false });

      if (error) throw error;

      // Convert snake_case to camelCase for React
      return data?.map(vehicle => ({
        id: vehicle?.id,
        name: vehicle?.name,
        vehicleType: vehicle?.vehicle_type,
        licensePlate: vehicle?.license_plate,
        capacity: vehicle?.capacity,
        imageUrl: vehicle?.image_url,
        description: vehicle?.description,
        features: vehicle?.features,
        dailyRate: vehicle?.daily_rate,
        status: vehicle?.status,
        createdBy: vehicle?.created_by,
        createdAt: vehicle?.created_at,
        updatedAt: vehicle?.updated_at
      })) || [];
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      throw error;
    }
  },

  /**
   * Create a new vehicle (admin only)
   */
  async create(vehicleData) {
    try {
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user) throw new Error('Not authenticated');

      // Convert camelCase to snake_case for database
      const { data, error } = await supabase?.from('vehicles')?.insert([{
          name: vehicleData?.name,
          vehicle_type: vehicleData?.vehicleType,
          license_plate: vehicleData?.licensePlate,
          capacity: vehicleData?.capacity,
          image_url: vehicleData?.imageUrl,
          description: vehicleData?.description,
          features: vehicleData?.features,
          daily_rate: vehicleData?.dailyRate,
          status: vehicleData?.status || 'active',
          created_by: user?.id
        }])?.select()?.single();

      if (error) throw error;

      // Convert back to camelCase
      return {
        id: data?.id,
        name: data?.name,
        vehicleType: data?.vehicle_type,
        licensePlate: data?.license_plate,
        capacity: data?.capacity,
        imageUrl: data?.image_url,
        description: data?.description,
        features: data?.features,
        dailyRate: data?.daily_rate,
        status: data?.status,
        createdBy: data?.created_by,
        createdAt: data?.created_at,
        updatedAt: data?.updated_at
      };
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw error;
    }
  },

  /**
   * Update an existing vehicle (admin only)
   */
  async update(vehicleId, vehicleData) {
    try {
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user) throw new Error('Not authenticated');

      // Convert camelCase to snake_case for database
      const { data, error } = await supabase?.from('vehicles')?.update({
          name: vehicleData?.name,
          vehicle_type: vehicleData?.vehicleType,
          license_plate: vehicleData?.licensePlate,
          capacity: vehicleData?.capacity,
          image_url: vehicleData?.imageUrl,
          description: vehicleData?.description,
          features: vehicleData?.features,
          daily_rate: vehicleData?.dailyRate,
          status: vehicleData?.status,
          updated_at: new Date()?.toISOString()
        })?.eq('id', vehicleId)?.select()?.single();

      if (error) throw error;

      // Convert back to camelCase
      return {
        id: data?.id,
        name: data?.name,
        vehicleType: data?.vehicle_type,
        licensePlate: data?.license_plate,
        capacity: data?.capacity,
        imageUrl: data?.image_url,
        description: data?.description,
        features: data?.features,
        dailyRate: data?.daily_rate,
        status: data?.status,
        createdBy: data?.created_by,
        createdAt: data?.created_at,
        updatedAt: data?.updated_at
      };
    } catch (error) {
      console.error('Error updating vehicle:', error);
      throw error;
    }
  },

  /**
   * Delete a vehicle (admin only)
   * If vehicle has associated records in any related table, deactivates it instead of hard deleting
   */
  async delete(vehicleId) {
    try {
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check all tables that reference vehicles via FK
      const checks = await Promise.all([
        supabase?.from('bookings')?.select('id')?.eq('vehicle_id', vehicleId)?.limit(1),
        supabase?.from('driver_profiles')?.select('id')?.eq('vehicle_id', vehicleId)?.limit(1),
        supabase?.from('corporate_vehicle_assignments')?.select('id')?.eq('vehicle_id', vehicleId)?.limit(1),
        supabase?.from('bulk_bookings')?.select('id')?.eq('vehicle_id', vehicleId)?.limit(1),
        supabase?.from('partner_vehicles')?.select('id')?.eq('vehicle_id', vehicleId)?.limit(1),
      ]);

      const hasReferences = checks?.some(({ data, error }) => !error && data && data?.length > 0);

      if (hasReferences) {
        // Vehicle is referenced elsewhere — soft delete by marking as inactive
        const { error: updateError } = await supabase
          ?.from('vehicles')
          ?.update({ status: 'inactive', updated_at: new Date()?.toISOString() })
          ?.eq('id', vehicleId);

        if (updateError) throw updateError;

        return { softDeleted: true };
      }

      // No references — safe to hard delete
      const { error } = await supabase?.from('vehicles')?.delete()?.eq('id', vehicleId);

      if (error) throw error;
      return { softDeleted: false };
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      throw error;
    }
  },

  /**
   * Upload vehicle image to storage
   */
  async uploadImage(vehicleId, file) {
    try {
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file?.name?.split('.')?.pop();
      const fileName = `${vehicleId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase?.storage?.from('vehicles')?.upload(fileName, file);

      if (error) throw error;

      // Get signed URL for private bucket
      const { data: signedUrlData, error: urlError } = await supabase?.storage?.from('vehicles')?.createSignedUrl(data?.path, 3600); // 1 hour expiry

      if (urlError) throw urlError;

      return {
        path: data?.path,
        signedUrl: signedUrlData?.signedUrl
      };
    } catch (error) {
      console.error('Error uploading vehicle image:', error);
      throw error;
    }
  },

  /**
   * Get signed URL for vehicle image
   */
  async getImageUrl(imagePath) {
    try {
      if (!imagePath) return null;

      const { data, error } = await supabase?.storage?.from('vehicles')?.createSignedUrl(imagePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data?.signedUrl;
    } catch (error) {
      console.error('Error getting vehicle image URL:', error);
      return null;
    }
  },

  /**
   * Delete vehicle image from storage
   */
  async deleteImage(imagePath) {
    try {
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase?.storage?.from('vehicles')?.remove([imagePath]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting vehicle image:', error);
      throw error;
    }
  }
};

export default vehicleService;