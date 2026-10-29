import { supabase } from '../lib/supabase';
import bookingService from './bookingService';

class TripTrackingService {
  // Get current active trip for user
  async getCurrentTrip(userId) {
    try {
      return await bookingService?.getCurrentTrip(userId);
    } catch (error) {
      console.error('Error fetching current trip:', error);
      return null;
    }
  }

  // Get trip history for user
  async getTripHistory(userId, limit = null) {
    try {
      const trips = await bookingService?.getUserBookings(userId);
      
      if (limit) {
        return trips?.slice(0, limit);
      }
      
      return trips;
    } catch (error) {
      console.error('Error fetching trip history:', error);
      return [];
    }
  }

  // Get notifications for user (mock implementation - can be enhanced with real notification system)
  async getNotifications(userId) {
    try {
      // For now, generate notifications based on current trip status
      const currentTrip = await this.getCurrentTrip(userId);
      const notifications = [];

      if (currentTrip) {
        const now = new Date();
        const pickupTime = new Date(currentTrip.pickup_date);
        const timeDiff = pickupTime?.getTime() - now?.getTime();
        const minutesUntilPickup = Math.floor(timeDiff / (1000 * 60));

        if (currentTrip?.status === 'confirmed' && minutesUntilPickup <= 30 && minutesUntilPickup > 0) {
          notifications?.push({
            id: 'pickup_reminder',
            type: 'arrival',
            title: 'Upcoming Trip',
            message: `Your trip to ${currentTrip?.destination} is in ${minutesUntilPickup} minutes`,
            timestamp: now,
            read: false,
            tripId: currentTrip?.id,
            actionRequired: false
          });
        }

        if (currentTrip?.status === 'in_progress') {
          notifications?.push({
            id: 'trip_active',
            type: 'trip_update',
            title: 'Trip in Progress',
            message: `You're on your way to ${currentTrip?.destination}`,
            timestamp: now,
            read: false,
            tripId: currentTrip?.id,
            actionRequired: false
          });
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  // Simulate trip progress (for demo purposes)
  simulateTripProgress(trip) {
    if (!trip || trip?.status !== 'in_progress') {
      return {
        progress: 0,
        eta: 'Unknown',
        remainingDistance: 'Unknown',
        currentLocation: null
      };
    }

    // Mock progress calculation
    const now = new Date();
    const pickupTime = new Date(trip.pickup_date);
    const elapsedMinutes = Math.floor((now - pickupTime) / (1000 * 60));
    const estimatedDuration = 45; // minutes
    const progress = Math.min((elapsedMinutes / estimatedDuration) * 100, 95);

    // Mock locations in Metro Manila
    const mockLocations = [
      { lat: 14.5547, lng: 121.0244, address: 'EDSA Guadalupe Bridge, Makati City' },
      { lat: 14.5349, lng: 121.0543, address: 'Ayala Avenue, Makati City' },
      { lat: 14.5176, lng: 121.0509, address: 'Buendia Avenue, Makati City' },
      { lat: 14.5074, lng: 121.0169, address: 'Roxas Boulevard, Pasay City' }
    ];

    const locationIndex = Math.floor(progress / 25) % mockLocations?.length;
    const remainingMinutes = Math.max(estimatedDuration - elapsedMinutes, 5);
    const remainingDistance = (remainingMinutes * 0.5)?.toFixed(1); // Rough km calculation

    return {
      progress: Math.round(progress),
      eta: new Date(now.getTime() + remainingMinutes * 60000)?.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      remainingDistance: `${remainingDistance} km`,
      currentLocation: mockLocations?.[locationIndex]
    };
  }

  // Update trip status
  async updateTripStatus(tripId, status) {
    try {
      return await bookingService?.updateBookingStatus(tripId, status);
    } catch (error) {
      console.error('Error updating trip status:', error);
      throw error;
    }
  }

  // Check if trip tracking is available (trip is active)
  async isTrackingAvailable(userId) {
    try {
      const currentTrip = await this.getCurrentTrip(userId);
      return currentTrip && ['confirmed', 'in_progress']?.includes(currentTrip?.status);
    } catch (error) {
      console.error('Error checking tracking availability:', error);
      return false;
    }
  }

  // Get trip by ID
  async getTripById(tripId, userId) {
    try {
      const { data, error } = await supabase
        ?.from('bookings')
        ?.select('*')
        ?.eq('id', tripId)
        ?.eq('user_id', userId)
        ?.single();

      if (error || !data) return null;

      // Fetch related data
      const [vehicleResult, driverResult] = await Promise.all([
        supabase?.from('vehicles')?.select('*')?.eq('id', data?.vehicle_id)?.single(),
        supabase?.from('driver_assignments')
          ?.select('*, driver_profiles(*, user_profiles(full_name, phone))')
          ?.eq('booking_id', data?.id)
          ?.single()
      ]);

      const driverProfile = driverResult?.data?.driver_profiles;

      return {
        id: data?.id,
        booking_code: data?.booking_code,
        status: data?.status,
        pickup: data?.pickup_location,
        destination: data?.dropoff_location,
        pickup_date: data?.pickup_date,
        return_date: data?.return_date,
        passenger_count: data?.passenger_count,
        total_cost: data?.total_cost,
        notes: data?.notes,
        vehicle: vehicleResult?.data,
        driver: driverProfile ? {
          name: driverProfile?.user_profiles?.full_name,
          phone: driverProfile?.user_profiles?.phone,
          photo: driverProfile?.photo_url || "https://images.unsplash.com/photo-1696347609175-49b310bb8106",
          photoAlt: 'Professional driver headshot',
          rating: driverProfile?.rating || 4.8,
          totalTrips: driverProfile?.total_trips || 0,
          licenseNumber: driverProfile?.license_number
        } : null
      };
    } catch (error) {
      console.error('Error fetching trip by ID:', error);
      return null;
    }
  }
}

export default new TripTrackingService();