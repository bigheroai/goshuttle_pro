import { supabase } from '../lib/supabase';

export const partnerFleetService = {
  // Get current user's partner information
  async getCurrentUserPartner() {
    try {
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if user has partner_fleet role
      const { data: userProfile } = await supabase?.from('user_profiles')?.select('id, role, full_name, email')?.eq('id', user?.id)?.single();

      if (!userProfile) throw new Error('User profile not found');

      // For now, if user is admin, they can access any partner
      // If user has partner_fleet role, find their associated partner
      // Otherwise, for demo purposes, allow any authenticated user to access the first partner
      
      let partnerQuery = supabase?.from('partners')?.select('*')?.eq('is_active', true)?.order('created_at', { ascending: false });

      // If user is not admin, try to find partner associated with this user
      if (userProfile?.role !== 'admin') {
        // First try to find partner created by this user
        const { data: userPartners } = await supabase?.from('partners')?.select('*')?.eq('created_by', user?.id)?.eq('is_active', true)?.limit(1);

        if (userPartners && userPartners?.length > 0) {
          return {
            id: userPartners?.[0]?.id,
            name: userPartners?.[0]?.name,
            companyName: userPartners?.[0]?.company_name,
            contactEmail: userPartners?.[0]?.contact_email,
            contactPhone: userPartners?.[0]?.contact_phone,
            address: userPartners?.[0]?.address,
            specialization: userPartners?.[0]?.specialization,
            isActive: userPartners?.[0]?.is_active,
            createdAt: userPartners?.[0]?.created_at,
            userRole: userProfile?.role
          };
        }
      }

      // Fallback: get the first available partner for demo purposes
      const { data: partners, error } = await partnerQuery?.limit(1);
      
      if (error) throw error;
      
      if (!partners || partners?.length === 0) {
        return {
          isDemo: true,
          message: 'No fleet partners found. Contact admin to set up your partner fleet account.',
          userRole: userProfile?.role
        };
      }

      return {
        id: partners?.[0]?.id,
        name: partners?.[0]?.name,
        companyName: partners?.[0]?.company_name,
        contactEmail: partners?.[0]?.contact_email,
        contactPhone: partners?.[0]?.contact_phone,
        address: partners?.[0]?.address,
        specialization: partners?.[0]?.specialization,
        isActive: partners?.[0]?.is_active,
        createdAt: partners?.[0]?.created_at,
        userRole: userProfile?.role,
        isDemo: userProfile?.role !== 'partner_fleet'
      };

    } catch (error) {
      console.error('Error getting current user partner:', error);
      throw error;
    }
  },

  // Partner Fleet Management
  async getFleetPartners() {
    const { data, error } = await supabase?.from('partners')?.select(`
        id,
        name,
        company_name,
        contact_email,
        contact_phone,
        address,
        specialization,
        is_active,
        created_at
      `)?.eq('partnership_type', 'transport_partner')?.eq('is_active', true)?.order('created_at', { ascending: false });

    if (error) throw error;
    
    return data?.map(partner => ({
      id: partner?.id,
      name: partner?.name,
      companyName: partner?.company_name,
      contactEmail: partner?.contact_email,
      contactPhone: partner?.contact_phone,
      address: partner?.address,
      specialization: partner?.specialization,
      isActive: partner?.is_active,
      createdAt: partner?.created_at
    }));
  },

  async getPartnerVehicles(partnerId) {
    const { data, error } = await supabase?.from('partner_vehicles')?.select(`
        id,
        vehicle_id,
        assigned_driver_id,
        assignment_date,
        is_active,
        vehicles (
          id,
          name,
          license_plate,
          vehicle_type,
          capacity,
          status,
          image_url
        ),
        user_profiles (
          id,
          full_name,
          email,
          phone
        )
      `)?.eq('partner_id', partnerId)?.eq('is_active', true);

    if (error) throw error;

    return data?.map(pv => ({
      id: pv?.id,
      vehicleId: pv?.vehicle_id,
      assignedDriverId: pv?.assigned_driver_id,
      assignmentDate: pv?.assignment_date,
      isActive: pv?.is_active,
      vehicle: pv?.vehicles ? {
        id: pv?.vehicles?.id,
        name: pv?.vehicles?.name,
        licensePlate: pv?.vehicles?.license_plate,
        vehicleType: pv?.vehicles?.vehicle_type,
        capacity: pv?.vehicles?.capacity,
        status: pv?.vehicles?.status,
        imageUrl: pv?.vehicles?.image_url
      } : null,
      driver: pv?.user_profiles ? {
        id: pv?.user_profiles?.id,
        fullName: pv?.user_profiles?.full_name,
        email: pv?.user_profiles?.email,
        phone: pv?.user_profiles?.phone
      } : null
    }));
  },

  async assignDriverToVehicle(partnerId, vehicleId, driverId) {
    const { data: { user } } = await supabase?.auth?.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase?.from('partner_vehicles')?.upsert({
        partner_id: partnerId,
        vehicle_id: vehicleId,
        assigned_driver_id: driverId,
        created_by: user?.id,
        assignment_date: new Date()?.toISOString()
      })?.select()?.single();

    if (error) throw error;
    return data;
  },

  // Driver Applications Management
  async getDriverApplications(partnerId) {
    const { data, error } = await supabase?.from('driver_applications')?.select(`
        id,
        user_id,
        full_name,
        phone,
        license_number,
        license_expiry,
        vehicle_owned,
        vehicle_details,
        application_status,
        background_check_status,
        documents_uploaded,
        preferred_fleet_type,
        created_at,
        approved_at,
        user_profiles (
          email,
          avatar_url
        )
      `)?.eq('partner_id', partnerId)?.order('created_at', { ascending: false });

    if (error) throw error;

    return data?.map(app => ({
      id: app?.id,
      userId: app?.user_id,
      fullName: app?.full_name,
      phone: app?.phone,
      licenseNumber: app?.license_number,
      licenseExpiry: app?.license_expiry,
      vehicleOwned: app?.vehicle_owned,
      vehicleDetails: app?.vehicle_details,
      applicationStatus: app?.application_status,
      backgroundCheckStatus: app?.background_check_status,
      documentsUploaded: app?.documents_uploaded,
      preferredFleetType: app?.preferred_fleet_type,
      createdAt: app?.created_at,
      approvedAt: app?.approved_at,
      email: app?.user_profiles?.email,
      avatarUrl: app?.user_profiles?.avatar_url
    }));
  },

  async approveDriverApplication(applicationId) {
    const { data: { user } } = await supabase?.auth?.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase?.from('driver_applications')?.update({
        application_status: 'approved',
        approved_at: new Date()?.toISOString(),
        approved_by: user?.id
      })?.eq('id', applicationId)?.select()?.single();

    if (error) throw error;

    // Update user role to driver
    const { error: roleError } = await supabase?.from('user_profiles')?.update({ role: 'driver' })?.eq('id', data?.user_id);

    if (roleError) throw roleError;

    return data;
  },

  async rejectDriverApplication(applicationId, reason) {
    const { data, error } = await supabase?.from('driver_applications')?.update({
        application_status: 'rejected',
        rejection_reason: reason
      })?.eq('id', applicationId)?.select()?.single();

    if (error) throw error;
    return data;
  },

  // Driver Schedules
  async getDriverSchedules(partnerId, startDate, endDate) {
    const { data, error } = await supabase?.from('driver_schedules')?.select(`
        id,
        driver_id,
        work_date,
        start_time,
        end_time,
        is_available,
        user_profiles (
          full_name,
          email,
          phone
        )
      `)?.eq('partner_id', partnerId)?.gte('work_date', startDate)?.lte('work_date', endDate)?.order('work_date', { ascending: true });

    if (error) throw error;

    return data?.map(schedule => ({
      id: schedule?.id,
      driverId: schedule?.driver_id,
      workDate: schedule?.work_date,
      startTime: schedule?.start_time,
      endTime: schedule?.end_time,
      isAvailable: schedule?.is_available,
      driver: {
        fullName: schedule?.user_profiles?.full_name,
        email: schedule?.user_profiles?.email,
        phone: schedule?.user_profiles?.phone
      }
    }));
  },

  // Fleet Analytics
  async getFleetAnalytics(partnerId) {
    const [vehiclesData, driversData, applicationsData] = await Promise.all([
      // Vehicle count
      supabase?.from('partner_vehicles')?.select('id', { count: 'exact' })?.eq('partner_id', partnerId)?.eq('is_active', true),
      
      // Active drivers count
      supabase?.from('partner_vehicles')?.select('assigned_driver_id', { count: 'exact' })?.eq('partner_id', partnerId)?.not('assigned_driver_id', 'is', null),
      
      // Applications count
      supabase?.from('driver_applications')?.select('application_status', { count: 'exact' })?.eq('partner_id', partnerId)
    ]);

    if (vehiclesData?.error) throw vehiclesData?.error;
    if (driversData?.error) throw driversData?.error;
    if (applicationsData?.error) throw applicationsData?.error;

    return {
      totalVehicles: vehiclesData?.count || 0,
      activeDrivers: driversData?.count || 0,
      pendingApplications: applicationsData?.count || 0
    };
  }
};