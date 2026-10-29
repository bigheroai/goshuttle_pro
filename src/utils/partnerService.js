import { supabase } from '../lib/supabase.js';

/**
 * Partners Service - Manages partner entities with user audit trail
 */

// Create a new partner with user tracking
export const createPartner = async (partnerData, userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required for partner creation');
    }

    const { data, error } = await supabase?.from('partners')?.insert([{
        ...partnerData,
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

// Get all partners with creator information
export const getAllPartners = async () => {
  try {
    const { data, error } = await supabase?.from('partners')?.select(`
        *,
        created_by_profile:created_by(full_name, email, role),
        updated_by_profile:updated_by(full_name, email, role)
      `)?.order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error?.message };
  }
};

// Get active partners only
export const getActivePartners = async () => {
  try {
    const { data, error } = await supabase?.from('partners')?.select('*')?.eq('is_active', true)?.order('name');

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error?.message };
  }
};

// Update partner with user tracking
export const updatePartner = async (partnerId, updates, userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required for partner updates');
    }

    const { data, error } = await supabase?.from('partners')?.update({
        ...updates,
        updated_by: userId,
        updated_at: new Date()?.toISOString()
      })?.eq('id', partnerId)?.select('*')?.single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error?.message };
  }
};

// Delete partner (soft delete by setting inactive)
export const deletePartner = async (partnerId, userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required for partner deletion');
    }

    const { data, error } = await supabase?.from('partners')?.update({
        is_active: false,
        updated_by: userId,
        updated_at: new Date()?.toISOString()
      })?.eq('id', partnerId)?.select('*')?.single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error?.message };
  }
};

// Get partner by ID with audit information
export const getPartnerById = async (partnerId) => {
  try {
    const { data, error } = await supabase?.from('partners')?.select(`
        *,
        created_by_profile:created_by(full_name, email, role),
        updated_by_profile:updated_by(full_name, email, role)
      `)?.eq('id', partnerId)?.single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error?.message };
  }
};

// Get partners by type
export const getPartnersByType = async (partnershipType) => {
  try {
    const { data, error } = await supabase?.from('partners')?.select('*')?.eq('partnership_type', partnershipType)?.eq('is_active', true)?.order('name');

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error?.message };
  }
};

// Search partners by name or company
export const searchPartners = async (searchTerm) => {
  try {
    const { data, error } = await supabase?.from('partners')?.select('*')?.or(`name.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`)?.eq('is_active', true)?.order('name');

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error?.message };
  }
};

// Upload partner logo to storage
export const uploadPartnerLogo = async (partnerId, file, userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required for logo upload');
    }

    const fileExt = file?.name?.split('.')?.pop();
    const fileName = `partner-${partnerId}-${Date.now()}.${fileExt}`;

    // Upload to partner bucket
    const { data: uploadData, error: uploadError } = await supabase?.storage?.from('partner')?.upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase?.storage?.from('partner')?.getPublicUrl(fileName);

    // Update partner with logo URL
    const { data, error } = await updatePartner(partnerId, {
      logo_url: publicUrl
    }, userId);

    if (error) {
      throw new Error(error);
    }

    return { data: { ...data, logo_url: publicUrl }, error: null };
  } catch (error) {
    return { data: null, error: error?.message };
  }
};