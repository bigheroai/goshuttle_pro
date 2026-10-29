import { supabase } from '../lib/supabase';

class PreferencesService {
  // Get user preferences by category
  async getPreferences(userId, category = null) {
    try {
      let query = supabase?.from('user_preferences')?.select('*')?.eq('user_id', userId)?.eq('is_active', true);

      if (category) {
        query = query?.eq('category', category);
      }

      const { data, error } = await query?.order('created_at', { ascending: false });

      if (error) throw error;

      // Convert to key-value object grouped by category
      const preferences = {};
      data?.forEach(pref => {
        if (!preferences?.[pref?.category]) {
          preferences[pref.category] = {};
        }
        preferences[pref.category][pref.preference_key] = pref?.preference_value;
      });

      return preferences;
    } catch (error) {
      console.error('Error loading preferences:', error);
      return {};
    }
  }

  // Update or create a preference
  async updatePreference(userId, category, key, value) {
    try {
      // Check if preference exists
      const { data: existing } = await supabase?.from('user_preferences')?.select('id')?.eq('user_id', userId)?.eq('category', category)?.eq('preference_key', key)?.single();

      if (existing) {
        // Update existing preference
        const { data, error } = await supabase?.from('user_preferences')?.update({ 
            preference_value: value,
            updated_at: new Date()?.toISOString()
          })?.eq('id', existing?.id)?.select()?.single();

        if (error) throw error;
        return data;
      } else {
        // Create new preference
        const { data, error } = await supabase?.from('user_preferences')?.insert({
            user_id: userId,
            category,
            preference_key: key,
            preference_value: value
          })?.select()?.single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error updating preference:', error);
      throw error;
    }
  }

  // Update multiple preferences at once
  async updatePreferences(userId, preferences) {
    try {
      const updates = [];
      
      for (const [category, categoryPrefs] of Object.entries(preferences)) {
        for (const [key, value] of Object.entries(categoryPrefs)) {
          updates?.push(this.updatePreference(userId, category, key, value));
        }
      }

      const results = await Promise.all(updates);
      return results;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  // Delete a preference
  async deletePreference(userId, category, key) {
    try {
      const { error } = await supabase?.from('user_preferences')?.update({ is_active: false })?.eq('user_id', userId)?.eq('category', category)?.eq('preference_key', key);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting preference:', error);
      throw error;
    }
  }

  // Get travel preferences (most commonly used)
  async getTravelPreferences(userId) {
    const preferences = await this.getPreferences(userId, 'travel');
    return preferences?.travel || {};
  }

  // Get communication preferences
  async getCommunicationPreferences(userId) {
    const preferences = await this.getPreferences(userId, 'communication');
    return preferences?.communication || {};
  }

  // Get accessibility preferences
  async getAccessibilityPreferences(userId) {
    const preferences = await this.getPreferences(userId, 'accessibility');
    return preferences?.accessibility || {};
  }

  // Save favorite route
  async saveFavoriteRoute(userId, routeData) {
    try {
      const existing = await this.getTravelPreferences(userId);
      const favoriteRoutes = existing?.favorite_routes || [];
      
      // Add new route if not already exists
      const routeKey = `${routeData?.from}_${routeData?.to}`;
      const routeExists = favoriteRoutes?.some(r => 
        `${r?.from}_${r?.to}` === routeKey
      );

      if (!routeExists) {
        favoriteRoutes?.push({
          ...routeData,
          saved_at: new Date()?.toISOString()
        });
        
        await this.updatePreference(userId, 'travel', 'favorite_routes', favoriteRoutes);
      }

      return favoriteRoutes;
    } catch (error) {
      console.error('Error saving favorite route:', error);
      throw error;
    }
  }

  // Get default preferences structure
  getDefaultPreferences() {
    return {
      travel: {
        preferred_pickup_time: 'morning',
        preferred_vehicle_type: 'van',
        notification_advance_time: 15,
        favorite_routes: [],
        auto_book_return: false
      },
      communication: {
        notification_sms: true,
        notification_email: true,
        notification_push: true,
        driver_contact_allowed: true,
        marketing_notifications: false
      },
      accessibility: {
        wheelchair_accessible: false,
        audio_assistance: false,
        large_text: false,
        high_contrast: false
      },
      routes: {
        avoid_tolls: false,
        fastest_route: true,
        eco_friendly: false
      }
    };
  }
}

export const preferencesService = new PreferencesService();
export default preferencesService;