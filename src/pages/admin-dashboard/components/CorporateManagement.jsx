import React, { useState, useEffect } from 'react';
import { Building2, Upload, Edit, Trash2, Plus } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import ImageUpload from '../../../components/ImageUpload';
import { supabase } from '../../../lib/supabase';
import { companyStorageService } from '../../../utils/companyStorageService';
import { useAuth } from '../../../contexts/AuthContext';

const CorporateManagement = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_email: '',
    contact_phone: ''
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const { data, error: companyError } = await companyStorageService?.getCompaniesWithLogos();
      
      if (companyError) {
        throw new Error(companyError);
      }

      setCompanies(data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      contact_email: '',
      contact_phone: ''
    });
    setEditingCompany(null);
    setShowAddModal(false);
  };

  const handleEdit = (company) => {
    setFormData({
      name: company?.name || '',
      address: company?.address || '',
      contact_email: company?.contact_email || '',
      contact_phone: company?.contact_phone || ''
    });
    setEditingCompany(company);
    setShowAddModal(true);
  };

  const handleCompanyLogoUpload = async (companyId, imageData) => {
    // Reload companies to refresh the logo URLs
    await loadCompanies();
    setError(null);
  };

  const handleCompanyLogoError = (error) => {
    setError(`Logo upload failed: ${error}`);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const companyData = {
        name: formData?.name,
        address: formData?.address,
        contact_email: formData?.contact_email,
        contact_phone: formData?.contact_phone,
        updated_at: new Date()?.toISOString()
      };

      if (editingCompany) {
        const { error } = await supabase
          ?.from('companies')
          ?.update(companyData)
          ?.eq('id', editingCompany?.id);

        if (error) throw new Error(error?.message);
      } else {
        const { error } = await supabase
          ?.from('companies')
          ?.insert([companyData]);

        if (error) throw new Error(error?.message);
      }

      resetForm();
      await loadCompanies();
    } catch (err) {
      setError(err?.message || 'Failed to save company');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (companyId) => {
    if (!confirm('Are you sure you want to delete this company?')) return;

    try {
      const { error } = await supabase
        ?.from('companies')
        ?.delete()
        ?.eq('id', companyId);

      if (error) throw new Error(error?.message);

      await loadCompanies();
    } catch (err) {
      setError(err?.message || 'Failed to delete company');
    }
  };

  if (loading && companies?.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Corporate Management</h2>
          <p className="text-gray-600">Manage corporate partners and their profiles</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies?.map((company) => (
          <div key={company?.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Company Logo */}
            <div className="relative h-32 bg-gray-100">
              {company?.logo_url ? (
                <img
                  src={company?.logo_url}
                  alt={`${company?.name} logo`}
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Building2 className="w-12 h-12 text-gray-400" />
                </div>
              )}
              
              {/* Logo Upload Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <ImageUpload
                  bucketName="company"
                  userId={user?.id}
                  folder={`company-${company?.id}`}
                  currentImageUrl={company?.logo_url}
                  onUploadSuccess={(imageData) => handleCompanyLogoUpload(company?.id, imageData)}
                  onUploadError={handleCompanyLogoError}
                  maxSizeText="5MB"
                  maxSizeMB={5}
                >
                  <Button variant="outline" size="sm" className="text-white border-white hover:bg-white hover:text-gray-900">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Logo
                  </Button>
                </ImageUpload>
              </div>
            </div>

            {/* Company Details */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{company?.name}</h3>
              
              <div className="space-y-2 text-sm text-gray-600">
                {company?.address && (
                  <p><span className="font-medium">Address:</span> {company?.address}</p>
                )}
                {company?.contact_email && (
                  <p><span className="font-medium">Email:</span> {company?.contact_email}</p>
                )}
                {company?.contact_phone && (
                  <p><span className="font-medium">Phone:</span> {company?.contact_phone}</p>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEdit(company)}
                  className="flex items-center gap-1"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDelete(company?.id)}
                  className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No companies message */}
      {companies?.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
          <p className="text-gray-600 mb-4">Get started by adding your first corporate partner.</p>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Company
          </Button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingCompany ? 'Edit Company' : 'Add New Company'}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </Button>
              </div>

              {/* Company Logo Upload Section */}
              {editingCompany && (
                <div className="mb-6 border-b border-gray-200 pb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Company Logo</h4>
                  <ImageUpload
                    bucketName="company"
                    userId={user?.id}
                    folder={`company-${editingCompany?.id}`}
                    currentImageUrl={editingCompany?.logo_url}
                    onUploadSuccess={(imageData) => handleCompanyLogoUpload(editingCompany?.id, imageData)}
                    onUploadError={handleCompanyLogoError}
                    maxSizeText="5MB"
                    maxSizeMB={5}
                  />
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <Input
                    value={formData?.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e?.target?.value }))}
                    placeholder="Enter company name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <Input
                    value={formData?.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e?.target?.value }))}
                    placeholder="Enter company address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <Input
                    type="email"
                    value={formData?.contact_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e?.target?.value }))}
                    placeholder="Enter contact email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <Input
                    type="tel"
                    value={formData?.contact_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e?.target?.value }))}
                    placeholder="Enter contact phone"
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    {loading ? 'Saving...' : editingCompany ? 'Update Company' : 'Add Company'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorporateManagement;