import { supabase } from '../lib/supabase';

export const driverService = {
  // Get all drivers with optional filtering
  async getAll(filters = {}) {
    let query = supabase?.from('driver_profiles')?.select(`
        *,
        user_profiles!driver_profiles_user_id_fkey (
          id,
          full_name,
          email,
          phone,
          avatar_url
        ),
        partners (
          id,
          name,
          company_name
        ),
        vehicles (
          id,
          name,
          license_plate,
          vehicle_type
        )
      `);

    if (filters?.status) {
      query = query?.eq('current_status', filters?.status);
    }
    if (filters?.fleetType) {
      query = query?.eq('fleet_type', filters?.fleetType);
    }
    if (filters?.partnerId) {
      query = query?.eq('partner_id', filters?.partnerId);
    }
    if (filters?.isVerified !== undefined) {
      query = query?.eq('is_verified', filters?.isVerified);
    }

    const { data, error } = await query?.order('created_at', { ascending: false });

    if (error) throw error;

    return data?.map(row => ({
      id: row?.id,
      userId: row?.user_id,
      partnerId: row?.partner_id,
      licenseNumber: row?.license_number,
      licenseExpiry: row?.license_expiry,
      vehicleId: row?.vehicle_id,
      currentStatus: row?.current_status,
      currentLocation: row?.current_location,
      lastLocationUpdate: row?.last_location_update,
      rating: row?.rating,
      totalTrips: row?.total_trips,
      fleetType: row?.fleet_type,
      isVerified: row?.is_verified,
      qualifications: row?.qualifications,
      availabilitySchedule: row?.availability_schedule,
      createdAt: row?.created_at,
      updatedAt: row?.updated_at,
      userProfile: row?.user_profiles ? {
        id: row?.user_profiles?.id,
        fullName: row?.user_profiles?.full_name,
        email: row?.user_profiles?.email,
        phone: row?.user_profiles?.phone,
        avatarUrl: row?.user_profiles?.avatar_url
      } : null,
      partner: row?.partners ? {
        id: row?.partners?.id,
        name: row?.partners?.name,
        companyName: row?.partners?.company_name
      } : null,
      vehicle: row?.vehicles ? {
        id: row?.vehicles?.id,
        name: row?.vehicles?.name,
        licensePlate: row?.vehicles?.license_plate,
        vehicleType: row?.vehicles?.vehicle_type
      } : null
    })) || [];
  },

  // Get driver by ID
  async getById(id) {
    const { data, error } = await supabase?.from('driver_profiles')?.select(`
        *,
        user_profiles!driver_profiles_user_id_fkey (
          id,
          full_name,
          email,
          phone,
          avatar_url
        ),
        partners (
          id,
          name,
          company_name
        ),
        vehicles (
          id,
          name,
          license_plate,
          vehicle_type
        )
      `)?.eq('id', id)?.single();

    if (error) throw error;

    if (!data) return null;

    return {
      id: data?.id,
      userId: data?.user_id,
      partnerId: data?.partner_id,
      licenseNumber: data?.license_number,
      licenseExpiry: data?.license_expiry,
      vehicleId: data?.vehicle_id,
      currentStatus: data?.current_status,
      currentLocation: data?.current_location,
      lastLocationUpdate: data?.last_location_update,
      rating: data?.rating,
      totalTrips: data?.total_trips,
      fleetType: data?.fleet_type,
      isVerified: data?.is_verified,
      qualifications: data?.qualifications,
      availabilitySchedule: data?.availability_schedule,
      createdAt: data?.created_at,
      updatedAt: data?.updated_at,
      userProfile: data?.user_profiles ? {
        id: data?.user_profiles?.id,
        fullName: data?.user_profiles?.full_name,
        email: data?.user_profiles?.email,
        phone: data?.user_profiles?.phone,
        avatarUrl: data?.user_profiles?.avatar_url
      } : null,
      partner: data?.partners ? {
        id: data?.partners?.id,
        name: data?.partners?.name,
        companyName: data?.partners?.company_name
      } : null,
      vehicle: data?.vehicles ? {
        id: data?.vehicles?.id,
        name: data?.vehicles?.name,
        licensePlate: data?.vehicles?.license_plate,
        vehicleType: data?.vehicles?.vehicle_type
      } : null
    };
  },

  // Update driver status
  async updateStatus(driverId, status) {
    const { data: { user } } = await supabase?.auth?.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase?.from('driver_profiles')?.update({
        current_status: status,
        last_location_update: new Date()?.toISOString()
      })?.eq('id', driverId)?.select()?.single();

    if (error) throw error;
    return data;
  },

  // Update driver location
  async updateLocation(driverId, location) {
    const { data: { user } } = await supabase?.auth?.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase?.from('driver_profiles')?.update({
        current_location: location,
        last_location_update: new Date()?.toISOString()
      })?.eq('id', driverId)?.select()?.single();

    if (error) throw error;
    return data;
  },

  // Get driver assignments
  async getAssignments(driverId, status) {
    let query = supabase?.from('driver_assignments')?.select(`
        *,
        bookings (
          id,
          pickup_location,
          dropoff_location,
          pickup_date,
          passenger_count,
          total_cost,
          status
        ),
        driver_profiles!driver_assignments_driver_id_fkey (
          id,
          user_profiles!driver_profiles_user_id_fkey (
            full_name
          )
        )
      `)?.eq('driver_id', driverId);

    if (status) {
      query = query?.eq('assignment_status', status);
    }

    const { data, error } = await query?.order('created_at', { ascending: false });

    if (error) throw error;

    return data?.map(row => ({
      id: row?.id,
      bookingId: row?.booking_id,
      driverId: row?.driver_id,
      assignedBy: row?.assigned_by,
      assignmentStatus: row?.assignment_status,
      assignedAt: row?.assigned_at,
      acceptedAt: row?.accepted_at,
      startedAt: row?.started_at,
      completedAt: row?.completed_at,
      cancelledAt: row?.cancelled_at,
      cancellationReason: row?.cancellation_reason,
      earnings: row?.earnings,
      createdAt: row?.created_at,
      updatedAt: row?.updated_at,
      booking: row?.bookings ? {
        id: row?.bookings?.id,
        pickupLocation: row?.bookings?.pickup_location,
        dropoffLocation: row?.bookings?.dropoff_location,
        pickupDate: row?.bookings?.pickup_date,
        passengerCount: row?.bookings?.passenger_count,
        totalCost: row?.bookings?.total_cost,
        status: row?.bookings?.status
      } : null,
      driver: row?.driver_profiles?.user_profiles ? {
        fullName: row?.driver_profiles?.user_profiles?.full_name
      } : null
    })) || [];
  },

  // Accept assignment
  async acceptAssignment(assignmentId) {
    const { data: { user } } = await supabase?.auth?.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase?.from('driver_assignments')?.update({
        assignment_status: 'confirmed',
        accepted_at: new Date()?.toISOString()
      })?.eq('id', assignmentId)?.select()?.single();

    if (error) throw error;
    return data;
  },

  // Start trip
  async startTrip(assignmentId) {
    const { data: { user } } = await supabase?.auth?.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase?.from('driver_assignments')?.update({
        assignment_status: 'in_progress',
        started_at: new Date()?.toISOString()
      })?.eq('id', assignmentId)?.select()?.single();

    if (error) throw error;
    return data;
  },

  // Complete trip
  async completeTrip(assignmentId) {
    const { data: { user } } = await supabase?.auth?.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase?.from('driver_assignments')?.update({
        assignment_status: 'completed',
        completed_at: new Date()?.toISOString()
      })?.eq('id', assignmentId)?.select()?.single();

    if (error) throw error;
    return data;
  },

  // Get driver performance
  async getPerformance(driverId, startDate, endDate) {
    let query = supabase?.from('driver_performance')?.select('*')?.eq('driver_id', driverId);

    if (startDate) {
      query = query?.gte('trip_date', startDate);
    }
    if (endDate) {
      query = query?.lte('trip_date', endDate);
    }

    const { data, error } = await query?.order('trip_date', { ascending: false });

    if (error) throw error;

    return data?.map(row => ({
      id: row?.id,
      driverId: row?.driver_id,
      tripDate: row?.trip_date,
      tripsCompleted: row?.trips_completed,
      totalEarnings: row?.total_earnings,
      averageRating: row?.average_rating,
      punctualityScore: row?.punctuality_score,
      safetyIncidents: row?.safety_incidents,
      customerComplaints: row?.customer_complaints,
      createdAt: row?.created_at
    })) || [];
  }
};

export const driverSignupService = {
  // Submit driver signup request
  async submitSignup(signupData) {
    const { data, error } = await supabase?.from('driver_signup_requests')?.insert({
        email: signupData?.email,
        full_name: signupData?.fullName,
        phone: signupData?.phone,
        license_number: signupData?.licenseNumber,
        license_expiry: signupData?.licenseExpiry,
        partner_id: signupData?.partnerId,
        fleet_type: signupData?.fleetType,
        documents: signupData?.documents || [],
        status: 'pending'
      })?.select()?.single();

    if (error) throw error;

    return {
      id: data?.id,
      email: data?.email,
      fullName: data?.full_name,
      phone: data?.phone,
      licenseNumber: data?.license_number,
      licenseExpiry: data?.license_expiry,
      partnerId: data?.partner_id,
      fleetType: data?.fleet_type,
      documents: data?.documents,
      status: data?.status,
      createdAt: data?.created_at
    };
  },

  // Get all signup requests
  async getAll(filters = {}) {
    let query = supabase?.from('driver_signup_requests')?.select(`
        *,
        partners (
          id,
          name,
          company_name
        )
      `);

    if (filters?.status) {
      query = query?.eq('status', filters?.status);
    }
    if (filters?.fleetType) {
      query = query?.eq('fleet_type', filters?.fleetType);
    }
    if (filters?.partnerId) {
      query = query?.eq('partner_id', filters?.partnerId);
    }

    const { data, error } = await query?.order('created_at', { ascending: false });

    if (error) throw error;

    return data?.map(row => ({
      id: row?.id,
      email: row?.email,
      fullName: row?.full_name,
      phone: row?.phone,
      licenseNumber: row?.license_number,
      licenseExpiry: row?.license_expiry,
      partnerId: row?.partner_id,
      fleetType: row?.fleet_type,
      documents: row?.documents,
      status: row?.status,
      reviewedBy: row?.reviewed_by,
      reviewedAt: row?.reviewed_at,
      notes: row?.notes,
      createdAt: row?.created_at,
      updatedAt: row?.updated_at,
      partner: row?.partners ? {
        id: row?.partners?.id,
        name: row?.partners?.name,
        companyName: row?.partners?.company_name
      } : null
    })) || [];
  },

  // Update signup request status
  async updateStatus(requestId, status, notes = '') {
    const { data: { user } } = await supabase?.auth?.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase?.from('driver_signup_requests')?.update({
        status: status,
        reviewed_by: user?.id,
        reviewed_at: new Date()?.toISOString(),
        notes: notes
      })?.eq('id', requestId)?.select()?.single();

    if (error) throw error;
    return data;
  }
};