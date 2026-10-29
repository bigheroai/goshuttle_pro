import { supabase } from '../lib/supabase';

/**
 * Service for managing destination restrictions and global pricing settings
 * Admin-controlled settings stored in app_settings table
 */
const destinationSettingsService = {
  /**
   * Get destination restrictions setting
   */
  async getDestinationRestrictions() {
    try {
      const { data, error } = await supabase
        ?.from('app_settings')
        ?.select('setting_value')
        ?.eq('setting_key', 'destination_restrictions')
        ?.single();
      if (error) return { enabled: false, allowed_destinations: [], restricted_destinations: [] };
      return data?.setting_value || { enabled: false, allowed_destinations: [], restricted_destinations: [] };
    } catch {
      return { enabled: false, allowed_destinations: [], restricted_destinations: [] };
    }
  },

  /**
   * Save destination restrictions setting (admin only)
   */
  async saveDestinationRestrictions(restrictions) {
    try {
      const { error } = await supabase
        ?.from('app_settings')
        ?.upsert({ setting_key: 'destination_restrictions', setting_value: restrictions }, { onConflict: 'setting_key' });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving destination restrictions:', error);
      throw error;
    }
  },

  /**
   * Get global excess hourly rate setting
   */
  async getGlobalExcessHourlyRate() {
    try {
      const { data, error } = await supabase
        ?.from('app_settings')
        ?.select('setting_value')
        ?.eq('setting_key', 'global_excess_hourly_rate')
        ?.single();
      if (error) return { rate: 300, base_hours: 10, notes: '' };
      return data?.setting_value || { rate: 300, base_hours: 10, notes: '' };
    } catch {
      return { rate: 300, base_hours: 10, notes: '' };
    }
  },

  /**
   * Save global excess hourly rate setting (admin only)
   */
  async saveGlobalExcessHourlyRate(rateConfig) {
    try {
      const { error } = await supabase
        ?.from('app_settings')
        ?.upsert({ setting_key: 'global_excess_hourly_rate', setting_value: rateConfig }, { onConflict: 'setting_key' });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving global excess hourly rate:', error);
      throw error;
    }
  },

  /**
   * Filter destinations based on restrictions
   * Returns filtered list if restrictions are enabled, otherwise returns all
   */
  filterDestinations(allDestinations, restrictions) {
    if (!restrictions?.enabled) return allDestinations;
    const allowed = restrictions?.allowed_destinations || [];
    if (allowed?.length === 0) return allDestinations;
    return allDestinations?.filter(dest => allowed?.includes(dest));
  }
};

export default destinationSettingsService;
