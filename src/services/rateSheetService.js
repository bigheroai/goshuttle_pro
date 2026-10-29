import { supabase } from '../lib/supabase';

/**
 * Rate sheet service for managing pricing rates
 * Handles CRUD operations for rate_sheets table
 */
const rateSheetService = {
  /**
   * Get all rate sheets (admin)
   */
  async getAll() {
    try {
      const { data, error } = await supabase
        ?.from('rate_sheets')
        ?.select('*')
        ?.order('vehicle_type')
        ?.order('trip_category');
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching rate sheets:', error);
      throw error;
    }
  },

  /**
   * Get applicable rate for a booking
   */
  async getApplicableRate(vehicleType, tripCategory, destinationZone) {
    try {
      const { data, error } = await supabase
        ?.rpc('get_applicable_rate', {
          p_vehicle_type: vehicleType,
          p_trip_category: tripCategory,
          p_destination_zone: destinationZone
        });
      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error fetching applicable rate:', error);
      return null;
    }
  },

  /**
   * Create a new rate sheet entry
   */
  async create(rateData) {
    try {
      const { data: { user } } = await supabase?.auth?.getUser();
      const { data, error } = await supabase
        ?.from('rate_sheets')
        ?.insert([{
          vehicle_type: rateData?.vehicleType,
          trip_category: rateData?.tripCategory,
          destination_zone: rateData?.destinationZone,
          base_rate: parseFloat(rateData?.baseRate) || 0,
          base_hours: parseInt(rateData?.baseHours) || 10,
          excess_hourly_rate: parseFloat(rateData?.excessHourlyRate) || 0,
          multi_day_rate: rateData?.multiDayRate ? parseFloat(rateData?.multiDayRate) : null,
          fuel_surcharge: parseFloat(rateData?.fuelSurcharge) || 0,
          notes: rateData?.notes || '',
          is_active: rateData?.isActive !== false,
          created_by: user?.id || null
        }])
        ?.select()
        ?.single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating rate sheet:', error);
      throw error;
    }
  },

  /**
   * Update an existing rate sheet entry
   */
  async update(id, rateData) {
    try {
      const { data, error } = await supabase
        ?.from('rate_sheets')
        ?.update({
          vehicle_type: rateData?.vehicleType,
          trip_category: rateData?.tripCategory,
          destination_zone: rateData?.destinationZone,
          base_rate: parseFloat(rateData?.baseRate) || 0,
          base_hours: parseInt(rateData?.baseHours) || 10,
          excess_hourly_rate: parseFloat(rateData?.excessHourlyRate) || 0,
          multi_day_rate: rateData?.multiDayRate ? parseFloat(rateData?.multiDayRate) : null,
          fuel_surcharge: parseFloat(rateData?.fuelSurcharge) || 0,
          notes: rateData?.notes || '',
          is_active: rateData?.isActive !== false,
          updated_at: new Date()?.toISOString()
        })
        ?.eq('id', id)
        ?.select()
        ?.single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating rate sheet:', error);
      throw error;
    }
  },

  /**
   * Delete a rate sheet entry
   */
  async delete(id) {
    try {
      const { error } = await supabase
        ?.from('rate_sheets')
        ?.delete()
        ?.eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting rate sheet:', error);
      throw error;
    }
  },

  /**
   * Toggle active status
   */
  async toggleActive(id, isActive) {
    try {
      const { data, error } = await supabase
        ?.from('rate_sheets')
        ?.update({ is_active: isActive, updated_at: new Date()?.toISOString() })
        ?.eq('id', id)
        ?.select()
        ?.single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error toggling rate sheet status:', error);
      throw error;
    }
  }
};

export default rateSheetService;
