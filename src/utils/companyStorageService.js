import { supabase } from '../lib/supabase';
import { imageStorageService } from './imageStorageService';

/**
 * Company Storage Service
 * Handles company logo uploads and management
 */
export const companyStorageService = {
  // Upload company logo
  async uploadCompanyLogo(companyId, file, userId) {
    return imageStorageService?.updateCompanyLogo(companyId, file, userId);
  },

  // Get company with fresh logo URL
  async getCompanyWithLogo(companyId) {
    try {
      const { data: company, error } = await supabase
        ?.from('companies')
        ?.select('*')
        ?.eq('id', companyId)
        ?.single();

      if (error) {
        return { data: null, error: error?.message };
      }

      // If company has a logo stored in our bucket, get fresh signed URL
      if (company?.logo_url && company?.logo_url?.includes('company')) {
        const filePath = `company-${companyId}/${company?.logo_url?.split('/')?.pop()}`;
        const { data: signedUrl } = await imageStorageService?.getSignedUrl('company', filePath);
        
        if (signedUrl) {
          company.logo_url = signedUrl;
        }
      }

      return { data: company, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to get company' };
    }
  },

  // List all companies with fresh logo URLs
  async getCompaniesWithLogos() {
    try {
      const { data: companies, error } = await supabase
        ?.from('companies')
        ?.select('*')
        ?.order('name');

      if (error) {
        return { data: null, error: error?.message };
      }

      // Update logo URLs for companies that have them stored in our bucket
      const companiesWithLogos = await Promise.all(
        companies?.map(async (company) => {
          if (company?.logo_url && company?.logo_url?.includes('company')) {
            const filePath = `company-${company?.id}/${company?.logo_url?.split('/')?.pop()}`;
            const { data: signedUrl } = await imageStorageService?.getSignedUrl('company', filePath);
            
            if (signedUrl) {
              company.logo_url = signedUrl;
            }
          }
          return company;
        }) || []
      );

      return { data: companiesWithLogos, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to get companies' };
    }
  },

  // Delete company logo
  async deleteCompanyLogo(companyId) {
    try {
      // Get current company to find the image path
      const { data: company } = await this.getCompanyWithLogo(companyId);
      
      if (company?.logo_url && company?.logo_url?.includes('company')) {
        // Extract file path and delete from storage
        const filePath = `company-${companyId}/${company?.logo_url?.split('/')?.pop()}`;
        await imageStorageService?.deleteFile('company', filePath);
      }

      // Update company to remove logo URL
      const { data, error } = await supabase
        ?.from('companies')
        ?.update({
          logo_url: null,
          updated_at: new Date()?.toISOString()
        })
        ?.eq('id', companyId)
        ?.select()
        ?.single();

      if (error) {
        return { data: null, error: error?.message };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to delete company logo' };
    }
  },

  // Get company's uploaded assets
  async getCompanyAssets(companyId) {
    return imageStorageService?.getUserImages('company', `company-${companyId}`);
  }
};