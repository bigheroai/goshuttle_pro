import { supabase } from '../lib/supabase';

class RouteService {
  // Get popular routes based on booking data
  async getPopularRoutes(limit = 6) {
    try {
      // Guard: if supabase client is not properly initialized, use fallback
      if (!supabase) {
        return this.getFallbackRoutes();
      }

      // First try to get admin-managed routes from the routes table
      let routesData, routesError;
      try {
        const result = await supabase?.
        from('routes')?.
        select('*')?.
        eq('is_active', true)?.
        order('is_popular', { ascending: false })?.
        order('sort_order', { ascending: true })?.
        limit(limit);
        routesData = result?.data;
        routesError = result?.error;
      } catch (networkErr) {
        return this.getFallbackRoutes();
      }

      if (!routesError && routesData && routesData?.length > 0) {
        return routesData?.map((route, index) => ({
          id: route?.id || index + 1,
          from: route?.from_location,
          to: route?.to_location,
          price: `₱${(route?.price || 0)?.toLocaleString()}`,
          duration: route?.duration || '',
          bookings: 0,
          popularity: route?.is_popular ? 90 : 60,
          trend: 'up',
          trendPercent: route?.is_popular ? 15 : 5,
          description: route?.description || 'Popular travel route',
          tags: route?.tags || ['Convenient', 'Reliable', 'Comfortable'],
          image: route?.image_url || 'https://images.unsplash.com/photo-1641997551104-50483dbb10ac',
          alt: route?.image_alt || 'Modern transportation vehicle on scenic highway during daylight',
          isPopular: route?.is_popular
        }));
      }

      // Fallback to booking-based popular routes
      let data, error;
      try {
        const result = await supabase?.from('bookings')?.select(`
            pickup_location,
            dropoff_location,
            total_cost
          `)?.eq('status', 'completed')?.not('pickup_location', 'is', null)?.not('dropoff_location', 'is', null)?.order('created_at', { ascending: false })?.limit(100);
        data = result?.data;
        error = result?.error;
      } catch (networkErr) {
        // Network error (e.g., no internet, CORS, invalid URL) — use fallback silently
        return this.getFallbackRoutes();
      }

      if (error) {
        // Silently fall back for network/fetch errors instead of throwing
        const errMsg = error?.message || '';
        if (
        errMsg?.includes('NetworkError') ||
        errMsg?.includes('fetch') ||
        errMsg?.includes('Failed to fetch') ||
        errMsg?.includes('TypeError') ||
        errMsg?.includes('network'))
        {
          return this.getFallbackRoutes();
        }
        throw error;
      }

      if (!data || data?.length === 0) {
        return this.getFallbackRoutes();
      }

      // Process routes to calculate popularity and metrics
      const routeMap = new Map();

      data?.forEach((booking) => {
        const routeKey = `${booking?.pickup_location} → ${booking?.dropoff_location}`;

        if (routeMap?.has(routeKey)) {
          const existing = routeMap?.get(routeKey);
          existing.bookings += 1;
          existing.totalCost += Number(booking?.total_cost || 0);
        } else {
          routeMap?.set(routeKey, {
            from: booking?.pickup_location,
            to: booking?.dropoff_location,
            bookings: 1,
            totalCost: Number(booking?.total_cost || 0)
          });
        }
      });

      // Convert to array and calculate metrics
      const routes = Array.from(routeMap?.entries())?.map(([routeKey, route], index) => {
        const avgCost = route?.bookings > 0 ? Math.round(route?.totalCost / route?.bookings) : 0;
        const popularity = Math.min(95, Math.round(route?.bookings / data?.length * 100 * 10)); // Scale up for visibility

        // Generate estimated duration based on distance (mock calculation)
        const estimatedHours = Math.max(1, Math.floor(Math.random() * 6) + 1);
        const estimatedMinutes = Math.floor(Math.random() * 60);
        const duration = `${estimatedHours}h ${estimatedMinutes > 0 ? estimatedMinutes + 'm' : ''}`?.trim();

        // Determine trend (mock trending for now)
        const trendTypes = ['up', 'down', 'stable'];
        const trend = trendTypes?.[Math.floor(Math.random() * trendTypes?.length)];
        const trendPercent = trend === 'up' ? Math.floor(Math.random() * 30) + 5 :
        trend === 'down' ? -(Math.floor(Math.random() * 15) + 1) :
        Math.floor(Math.random() * 10) - 5;

        // Generate description and tags based on route
        const { description, tags, image, alt } = this.generateRouteMetadata(route?.from, route?.to);

        return {
          id: index + 1,
          from: route?.from,
          to: route?.to,
          price: `₱${avgCost?.toLocaleString()}`,
          duration,
          bookings: route?.bookings,
          popularity,
          trend,
          trendPercent,
          description,
          tags,
          image,
          alt
        };
      });

      // Sort by bookings and popularity, then take top routes
      const popularRoutes = routes?.sort((a, b) => b?.bookings * b?.popularity - a?.bookings * a?.popularity)?.slice(0, limit);

      return popularRoutes;
    } catch (error) {
      // Silently return fallback data on any error
      return this.getFallbackRoutes();
    }
  }

  // Generate route metadata for description, tags, and images
  generateRouteMetadata(from, to) {
    const routeData = {
      'Manila → Baguio': {
        description: 'Scenic mountain escape route',
        tags: ['Mountain Views', 'Cool Weather', 'Tourist Favorite'],
        image: 'https://images.unsplash.com/photo-1666578232446-553686d4e3b3',
        alt: 'Scenic mountain road winding through lush green hills with misty peaks in background'
      },
      'Cebu → Bohol': {
        description: 'Island paradise connection',
        tags: ['Beach Access', 'Island Hopping', 'Family Friendly'],
        image: 'https://images.unsplash.com/photo-1629732316015-0310c987ae0f',
        alt: 'Crystal clear turquoise ocean water with white sandy beach and tropical palm trees'
      },
      'Davao → General Santos': {
        description: 'Business corridor route',
        tags: ['Business Hub', 'Fast Route', 'Corporate Preferred'],
        image: "https://img.rocket.new/generatedImages/rocket_gen_img_1156f5121-1776232553346.png",
        alt: 'Modern city skyline with tall buildings reflected in calm river water during golden sunset'
      }
    };

    const routeKey = `${from} → ${to}`;

    if (routeData?.[routeKey]) {
      return routeData?.[routeKey];
    }

    // Default metadata for unknown routes
    return {
      description: 'Popular travel route',
      tags: ['Convenient', 'Reliable', 'Comfortable'],
      image: "https://images.unsplash.com/photo-1641997551104-50483dbb10ac",
      alt: 'Modern transportation vehicle on scenic highway during daylight'
    };
  }

  // Fallback routes when database is empty or error occurs
  getFallbackRoutes() {
    return [
    {
      id: 1,
      from: "Quezon City",
      to: "Makati",
      price: "₱350",
      duration: "45m",
      bookings: 1580,
      popularity: 92,
      trend: "up",
      trendPercent: 18,
      description: "Express city shuttle route",
      tags: ["Express Service", "Business Route", "Daily Commute"],
      image: "https://images.unsplash.com/photo-1668563972736-157f88ddbf7b",
      alt: "Makati city skyline with modern skyscrapers and business district at dusk"
    },
    {
      id: 2,
      from: "Alabang",
      to: "Tagaytay",
      price: "₱600",
      duration: "1h 30m",
      bookings: 920,
      popularity: 85,
      trend: "up",
      trendPercent: 22,
      description: "Scenic weekend getaway route",
      tags: ["Scenic Route", "Cool Weather", "Weekend Favorite"],
      image: "https://images.unsplash.com/photo-1594706504824-7ec050b66344",
      alt: "Panoramic view of Taal Lake and volcano from Tagaytay ridge with lush greenery"
    },
    {
      id: 3,
      from: "Calamba",
      to: "Makati",
      price: "₱750",
      duration: "1h 45m",
      bookings: 760,
      popularity: 78,
      trend: "up",
      trendPercent: 14,
      description: "CALABARZON to Metro Manila express",
      tags: ["Express Service", "Corporate Preferred", "Laguna Route"],
      image: "https://images.unsplash.com/photo-1612500187852-1a31f58fb291",
      alt: "Modern highway connecting Laguna province to Metro Manila with vehicles in transit"
    },
    {
      id: 4,
      from: "Cavite",
      to: "Alabang",
      price: "₱400",
      duration: "40m",
      bookings: 680,
      popularity: 72,
      trend: "up",
      trendPercent: 10,
      description: "South Metro connector route",
      tags: ["Economy Pricing", "Frequent Trips", "South Route"],
      image: "https://images.unsplash.com/photo-1711076234443-c9bc6bbf1b53",
      alt: "Busy transport hub with vehicles and passengers in a southern Metro Manila area"
    },
    {
      id: 5,
      from: "Sto. Tomas Batangas",
      to: "Makati",
      price: "₱850",
      duration: "2h",
      bookings: 540,
      popularity: 65,
      trend: "up",
      trendPercent: 8,
      description: "Batangas to Metro Manila shuttle",
      tags: ["Long Distance", "Comfortable", "Batangas Route"],
      image: "https://images.unsplash.com/photo-1668563972736-157f88ddbf7b",
      alt: "Makati city skyline with modern skyscrapers and business district at dusk"
    },
    {
      id: 6,
      from: "Quezon City",
      to: "Tagaytay",
      price: "₱800",
      duration: "2h",
      bookings: 480,
      popularity: 60,
      trend: "stable",
      trendPercent: 3,
      description: "North to south scenic route",
      tags: ["Scenic Route", "Weekend Trip", "Family Friendly"],
      image: "https://images.unsplash.com/photo-1594706504824-7ec050b66344",
      alt: "Panoramic view of Taal Lake and volcano from Tagaytay ridge with lush greenery"
    }];

  }

  // Get route pricing estimate
  async getRoutePricing(fromLocation, toLocation, passengerCount = 1, vehicleType = null) {
    try {
      // Get vehicles for pricing
      const { data: vehicles } = await supabase?.from('vehicles')?.select('*')?.eq('status', 'active')?.order('daily_rate');

      if (!vehicles?.length) {
        return { estimatedPrice: 1000, availableVehicles: [] };
      }

      // Filter by vehicle type if specified
      const filteredVehicles = vehicleType ?
      vehicles?.filter((v) => v?.vehicle_type === vehicleType) :
      vehicles;

      const availableVehicles = filteredVehicles?.filter((v) => v?.capacity >= passengerCount);

      if (!availableVehicles?.length) {
        return { estimatedPrice: 0, availableVehicles: [], error: 'No vehicles available for passenger count' };
      }

      // Estimate price based on cheapest available vehicle
      const basePrice = Math.min(...availableVehicles?.map((v) => v?.daily_rate || 1000));

      // Add distance multiplier (mock calculation)
      const distanceMultiplier = Math.random() * 0.5 + 0.8; // 0.8 to 1.3x
      const estimatedPrice = Math.round(basePrice * distanceMultiplier);

      return {
        estimatedPrice,
        availableVehicles: availableVehicles?.map((v) => ({
          id: v?.id,
          name: v?.name,
          capacity: v?.capacity,
          vehicleType: v?.vehicle_type,
          dailyRate: v?.daily_rate,
          features: v?.features,
          imageUrl: v?.image_url
        }))
      };
    } catch (error) {
      console.error('Error getting route pricing:', error);
      return { estimatedPrice: 1000, availableVehicles: [], error: error?.message };
    }
  }
}

export default new RouteService();