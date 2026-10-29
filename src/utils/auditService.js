import { supabase } from '../lib/supabase.js';

/**
 * Audit Service - Manages user audit trail for all data operations
 */

// Get all entities managed by a specific user
export const getUserManagedEntities = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const { data, error } = await supabase?.rpc('get_user_managed_entities', { user_uuid: userId });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error?.message };
  }
};

// Update company with user tracking
export const updateCompanyWithAudit = async (companyId, updates, userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required for company updates');
    }

    const { data, error } = await supabase?.from('companies')?.update({
        ...updates,
        updated_by: userId,
        updated_at: new Date()?.toISOString()
      })?.eq('id', companyId)?.select('*')?.single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error?.message };
  }
};

// Create company with user tracking
export const createCompanyWithAudit = async (companyData, userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required for company creation');
    }

    const { data, error } = await supabase?.from('companies')?.insert([{
        ...companyData,
        created_by: userId,
        updated_by: userId
      }])?.select('*')?.single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error?.message };
  }
};

// Update booking with user tracking
export const updateBookingWithAudit = async (bookingId, updates, userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required for booking updates');
    }

    const { data, error } = await supabase?.from('bookings')?.update({
        ...updates,
        updated_by: userId,
        updated_at: new Date()?.toISOString()
      })?.eq('id', bookingId)?.select('*')?.single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error?.message };
  }
};

// Get comprehensive audit trail for an entity
export const getEntityAuditTrail = async (entityType, entityId) => {
  try {
    let tableName = '';
    let selectQuery = '';

    switch (entityType) {
      case 'partner':
        tableName = 'partners';
        selectQuery = `
          id, name, created_at, updated_at,
          created_by_profile:created_by(full_name, email, role),
          updated_by_profile:updated_by(full_name, email, role)
        `;
        break;
      case 'company':
        tableName = 'companies';
        selectQuery = `
          id, name, created_at, updated_at,
          created_by_profile:created_by(full_name, email, role),
          updated_by_profile:updated_by(full_name, email, role)
        `;
        break;
      case 'booking':
        tableName = 'bookings';
        selectQuery = `
          id, pickup_location, dropoff_location, created_at, updated_at,
          user_profile:user_id(full_name, email, role),
          updated_by_profile:updated_by(full_name, email, role)
        `;
        break;
      case 'vehicle':
        tableName = 'vehicles';
        selectQuery = `
          id, name, license_plate, created_at, updated_at,
          created_by_profile:created_by(full_name, email, role)
        `;
        break;
      default:
        throw new Error('Invalid entity type');
    }

    const { data, error } = await supabase?.from(tableName)?.select(selectQuery)?.eq('id', entityId)?.single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error?.message };
  }
};

// Get user activity summary
export const getUserActivitySummary = async (userId, timeframe = '30 days') => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const timeframeSql = timeframe === '7 days' ? "NOW() - INTERVAL '7 days'" :
                        timeframe === '30 days' ? "NOW() - INTERVAL '30 days'" :
                        "NOW() - INTERVAL '90 days'";

    // Get companies created/updated
    const { data: companiesData, error: companiesError } = await supabase?.from('companies')?.select('id, name, created_at, updated_at')?.or(`created_by.eq.${userId},updated_by.eq.${userId}`)?.gte('updated_at', new Date(Date.now() - (timeframe === '7 days' ? 7 : timeframe === '30 days' ? 30 : 90) * 24 * 60 * 60 * 1000)?.toISOString());

    // Get partners created/updated
    const { data: partnersData, error: partnersError } = await supabase?.from('partners')?.select('id, name, created_at, updated_at')?.or(`created_by.eq.${userId},updated_by.eq.${userId}`)?.gte('updated_at', new Date(Date.now() - (timeframe === '7 days' ? 7 : timeframe === '30 days' ? 30 : 90) * 24 * 60 * 60 * 1000)?.toISOString());

    // Get vehicles created
    const { data: vehiclesData, error: vehiclesError } = await supabase?.from('vehicles')?.select('id, name, created_at, updated_at')?.eq('created_by', userId)?.gte('updated_at', new Date(Date.now() - (timeframe === '7 days' ? 7 : timeframe === '30 days' ? 30 : 90) * 24 * 60 * 60 * 1000)?.toISOString());

    // Get bookings updated
    const { data: bookingsData, error: bookingsError } = await supabase?.from('bookings')?.select('id, pickup_location, dropoff_location, updated_at')?.eq('updated_by', userId)?.gte('updated_at', new Date(Date.now() - (timeframe === '7 days' ? 7 : timeframe === '30 days' ? 30 : 90) * 24 * 60 * 60 * 1000)?.toISOString());

    if (companiesError || partnersError || vehiclesError || bookingsError) {
      throw new Error('Failed to fetch activity summary');
    }

    const summary = {
      companies: companiesData || [],
      partners: partnersData || [],
      vehicles: vehiclesData || [],
      bookings: bookingsData || [],
      totalActivities: (companiesData?.length || 0) + (partnersData?.length || 0) + 
                      (vehiclesData?.length || 0) + (bookingsData?.length || 0)
    };

    return { data: summary, error: null };
  } catch (error) {
    return { data: null, error: error?.message };
  }
};

// Get all entities with their creators (admin view)
export const getAllEntitiesWithAudit = async () => {
  try {
    // Get all companies with audit info
    const { data: companies, error: companiesError } = await supabase?.from('companies')?.select(`
        id, name, created_at, updated_at,
        created_by_profile:created_by(full_name, email, role),
        updated_by_profile:updated_by(full_name, email, role)
      `)?.order('updated_at', { ascending: false });

    // Get all partners with audit info  
    const { data: partners, error: partnersError } = await supabase?.from('partners')?.select(`
        id, name, created_at, updated_at,
        created_by_profile:created_by(full_name, email, role),
        updated_by_profile:updated_by(full_name, email, role)
      `)?.order('updated_at', { ascending: false });

    if (companiesError || partnersError) {
      throw new Error('Failed to fetch entities with audit information');
    }

    return { 
      data: {
        companies: companies || [],
        partners: partners || []
      }, 
      error: null 
    };
  } catch (error) {
    return { data: null, error: error?.message };
  }
};