import { supabase } from '../lib/supabase';

export const fleetPartnerService = {
  async submitPartnerApplication(formData) {
    const { data: { user } } = await supabase?.auth?.getUser();
    if (!user) throw new Error('Not authenticated');

    // Convert camelCase to snake_case for database
    const { data, error } = await supabase?.from('partners')?.insert({
        created_by: user?.id,
        name: formData?.companyName,
        company_name: formData?.companyName,
        contact_email: formData?.contactEmail,
        contact_phone: formData?.contactPhone,
        address: formData?.address,
        specialization: formData?.specialization,
        partnership_type: 'transport_partner',
        is_active: false // Pending approval
      })?.select()?.single();

    if (error) throw error;

    // Convert back to camelCase for React
    return {
      id: data?.id,
      name: data?.name,
      companyName: data?.company_name,
      contactEmail: data?.contact_email,
      contactPhone: data?.contact_phone,
      address: data?.address,
      specialization: data?.specialization,
      partnershipType: data?.partnership_type,
      isActive: data?.is_active,
      createdAt: data?.created_at,
      createdBy: data?.created_by
    };
  },

  async uploadPartnerDocument(file, userId, documentType) {
    const fileExt = file?.name?.split('.')?.pop();
    const fileName = `${documentType}_${Date.now()}.${fileExt}`;
    const filePath = `${userId}/partner_documents/${fileName}`;

    const { data, error } = await supabase?.storage?.from('partner')?.upload(filePath, file);

    if (error) throw error;

    return {
      path: data?.path,
      fileName: fileName,
      documentType: documentType
    };
  },

  async getPartnerDocumentUrl(filePath) {
    const { data, error } = await supabase?.storage?.from('partner')?.createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) throw error;
    return data?.signedUrl;
  },

  async checkPartnerExists(email) {
    const { data, error } = await supabase?.from('partners')?.select('id, contact_email')?.eq('contact_email', email)?.single();

    if (error && error?.code !== 'PGRST116') throw error;
    return !!data;
  }
};