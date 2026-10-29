import { supabase } from '../lib/supabase';

// Helper: check if a string is a valid UUID
const isValidUUID = (value) => {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i?.test(String(value));
};

const favoriteBookingsService = {
  async getFavorites(userId) {
    try {
      const { data, error } = await supabase?.from('favorite_bookings')?.select('*')?.eq('user_id', userId)?.order('created_at', { ascending: false });

      if (error) throw error;
      return data?.map(fav => ({
        id: fav?.id,
        userId: fav?.user_id,
        name: fav?.name,
        route: { from: fav?.route_from, to: fav?.route_to },
        vehicleId: fav?.vehicle_id,
        vehicleName: fav?.vehicle_name,
        vehicleType: fav?.vehicle_type,
        vehiclePrice: fav?.vehicle_price,
        paymentMethod: fav?.payment_method,
        passengerCount: fav?.passenger_count,
        createdAt: fav?.created_at
      })) || [];
    } catch (error) {
      console.error('Error fetching favorites:', error);
      return [];
    }
  },

  async saveFavorite(userId, bookingData, name) {
    try {
      // Sanitize vehicle_id — must be a valid UUID or null (not a number/string like 'custom')
      const rawVehicleId = bookingData?.vehicle?.id;
      const vehicleId = isValidUUID(rawVehicleId) ? rawVehicleId : null;

      // Sanitize vehicle_price — must be a number or null
      const rawPrice = bookingData?.vehicle?.price;
      const vehiclePrice = (rawPrice !== null && rawPrice !== undefined && !isNaN(Number(rawPrice)))
        ? Number(rawPrice)
        : null;

      const { data, error } = await supabase?.from('favorite_bookings')?.insert({
          user_id: userId,
          name: name || 'My Favorite Route',
          route_from: bookingData?.route?.from || '',
          route_to: bookingData?.route?.to || '',
          vehicle_id: vehicleId,
          vehicle_name: bookingData?.vehicle?.name || null,
          vehicle_type: bookingData?.vehicle?.type || null,
          vehicle_price: vehiclePrice,
          payment_method: bookingData?.paymentDetails?.method || null,
          passenger_count: bookingData?.passengerCount || 1
        })?.select()?.single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error saving favorite:', error);
      return { success: false, error: error?.message };
    }
  },

  async deleteFavorite(favoriteId) {
    try {
      const { error } = await supabase?.from('favorite_bookings')?.delete()?.eq('id', favoriteId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting favorite:', error);
      return { success: false, error: error?.message };
    }
  }
};

export default favoriteBookingsService;
