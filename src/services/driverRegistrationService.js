import { supabase } from '../lib/supabase';

export const driverRegistrationService = {
  async submitApplication(formData) {
    const { data: { user } } = await supabase?.auth?.getUser();
    // user_id is optional — unauthenticated applicants are allowed
    const userId = user?.id || null;

    // Use the SECURITY DEFINER RPC function to bypass RLS for the INSERT.
    // This is the most reliable approach — it works for both anon and authenticated users.
    const { data: rpcData, error: rpcError } = await supabase?.rpc('submit_driver_application', {
      p_full_name: formData?.fullName,
      p_email: formData?.email,
      p_phone: formData?.phone,
      p_preferred_fleet_type: formData?.preferredFleetType || 'goshuttle',
      p_partner_id: formData?.partnerId || null,
      p_documents_uploaded: formData?.documentsUploaded || [],
      p_user_id: userId
    });

    if (rpcError) {
      // Fallback: direct insert (in case RPC function isn't deployed yet)
      const { data, error } = await supabase?.from('driver_applications')?.insert({
        user_id: userId,
        full_name: formData?.fullName,
        phone: formData?.phone,
        email: formData?.email,
        preferred_fleet_type: formData?.preferredFleetType || 'goshuttle',
        documents_uploaded: formData?.documentsUploaded || [],
        application_status: 'pending',background_check_status: 'pending',
        partner_id: formData?.partnerId || null
      })?.select()?.single();

      if (error) throw error;

      return {
        id: data?.id,
        userId: data?.user_id,
        fullName: data?.full_name,
        phone: data?.phone,
        licenseNumber: data?.license_number,
        licenseExpiry: data?.license_expiry,
        vehicleOwned: data?.vehicle_owned,
        vehicleDetails: data?.vehicle_details,
        preferredFleetType: data?.preferred_fleet_type,
        documentsUploaded: data?.documents_uploaded,
        applicationStatus: data?.application_status,
        backgroundCheckStatus: data?.background_check_status,
        partnerId: data?.partner_id,
        createdAt: data?.created_at
      };
    }

    // Convert JSONB result back to camelCase for React
    const data = rpcData;
    return {
      id: data?.id,
      userId: data?.user_id,
      fullName: data?.full_name,
      phone: data?.phone,
      licenseNumber: data?.license_number,
      licenseExpiry: data?.license_expiry,
      vehicleOwned: data?.vehicle_owned,
      vehicleDetails: data?.vehicle_details,
      preferredFleetType: data?.preferred_fleet_type,
      documentsUploaded: data?.documents_uploaded,
      applicationStatus: data?.application_status,
      backgroundCheckStatus: data?.background_check_status,
      partnerId: data?.partner_id,
      createdAt: data?.created_at
    };
  },

  async getActivePartners() {
    const { data, error } = await supabase?.from('partners')?.select('id, name, company_name, specialization, partnership_type')?.eq('is_active', true)?.eq('partnership_type', 'transport_partner');

    if (error) throw error;

    return data?.map(partner => ({
      id: partner?.id,
      name: partner?.name,
      companyName: partner?.company_name,
      specialization: partner?.specialization,
      partnershipType: partner?.partnership_type
    }));
  },

  async uploadDocument(file, userId, documentType) {
    const fileExt = file?.name?.split('.')?.pop();
    const fileName = `${documentType}_${Date.now()}.${fileExt}`;
    const filePath = `${userId}/driver_documents/${fileName}`;

    const { data, error } = await supabase?.storage?.from('driver-documents')?.upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

    if (error) throw error;

    return {
      path: data?.path,
      fileName: fileName,
      documentType: documentType
    };
  },

  async getDocumentUrl(filePath) {
    const { data, error } = await supabase?.storage?.from('driver-documents')?.createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) throw error;
    return data?.signedUrl;
  }
};