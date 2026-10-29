import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit3, Trash2, Building2, Phone, Mail } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  createPartner, 
  getAllPartners, 
  updatePartner, 
  deletePartner,
  getPartnersByType,
  searchPartners,
  uploadPartnerLogo
} from '../../../utils/partnerService';
import ImageUpload from '../../../components/ImageUpload';

const PartnerManagement = () => {
  const { user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    specialization: '',
    partnership_type: 'transport_partner'
  });

  const partnershipTypes = [
    { value: 'transport_partner', label: 'Transport Partner' },
    { value: 'logistics_partner', label: 'Logistics Partner' },
    { value: 'technology_partner', label: 'Technology Partner' },
    { value: 'service_partner', label: 'Service Partner' }
  ];

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const { data, error } = await getAllPartners();
      if (error) {
        setError(error);
      } else {
        setPartners(data || []);
      }
    } catch (err) {
      setError('Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm?.trim()) {
      loadPartners();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await searchPartners(searchTerm);
      if (error) {
        setError(error);
      } else {
        setPartners(data || []);
      }
    } catch (err) {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeFilter = async () => {
    if (selectedType === 'all') {
      loadPartners();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await getPartnersByType(selectedType);
      if (error) {
        setError(error);
      } else {
        setPartners(data || []);
      }
    } catch (err) {
      setError('Filter failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleTypeFilter();
  }, [selectedType]);

  const handleCreatePartner = async (e) => {
    e?.preventDefault();
    if (!user?.id) {
      setError('User authentication required');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await createPartner(formData, user?.id);
      if (error) {
        setError(error);
      } else {
        setSuccess('Partner created successfully');
        setShowCreateModal(false);
        resetForm();
        loadPartners();
      }
    } catch (err) {
      setError('Failed to create partner');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPartner = async (e) => {
    e?.preventDefault();
    if (!user?.id || !selectedPartner?.id) {
      setError('User authentication or partner selection required');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await updatePartner(selectedPartner?.id, formData, user?.id);
      if (error) {
        setError(error);
      } else {
        setSuccess('Partner updated successfully');
        setShowEditModal(false);
        resetForm();
        loadPartners();
      }
    } catch (err) {
      setError('Failed to update partner');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePartner = async (partnerId) => {
    if (!user?.id) {
      setError('User authentication required');
      return;
    }

    if (window.confirm('Are you sure you want to deactivate this partner?')) {
      setLoading(true);
      try {
        const { error } = await deletePartner(partnerId, user?.id);
        if (error) {
          setError(error);
        } else {
          setSuccess('Partner deactivated successfully');
          loadPartners();
        }
      } catch (err) {
        setError('Failed to deactivate partner');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLogoUpload = async (partnerId, file) => {
    if (!user?.id) {
      setError('User authentication required');
      return;
    }

    try {
      const { data, error } = await uploadPartnerLogo(partnerId, file, user?.id);
      if (error) {
        setError(error);
      } else {
        setSuccess('Logo uploaded successfully');
        loadPartners();
      }
    } catch (err) {
      setError('Failed to upload logo');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      company_name: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      specialization: '',
      partnership_type: 'transport_partner'
    });
    setSelectedPartner(null);
  };

  const openEditModal = (partner) => {
    setSelectedPartner(partner);
    setFormData({
      name: partner?.name || '',
      company_name: partner?.company_name || '',
      contact_email: partner?.contact_email || '',
      contact_phone: partner?.contact_phone || '',
      address: partner?.address || '',
      specialization: partner?.specialization || '',
      partnership_type: partner?.partnership_type || 'transport_partner'
    });
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Partner Management</h2>
          <p className="text-gray-600">Manage transport and logistics partners</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Partner
        </button>
      </div>
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search partners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e?.target?.value)}
                onKeyPress={(e) => e?.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e?.target?.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            {partnershipTypes?.map(type => (
              <option key={type?.value} value={type?.value}>{type?.label}</option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Search
          </button>
        </div>
      </div>
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      {/* Partners List */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading partners...</p>
          </div>
        ) : partners?.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No partners found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Partner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {partners?.map((partner) => (
                  <tr key={partner?.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {partner?.logo_url ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={partner?.logo_url}
                              alt={partner?.name || 'Partner'}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {partner?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {partner?.company_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-gray-400" />
                          {partner?.contact_email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {partner?.contact_phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {partnershipTypes?.find(t => t?.value === partner?.partnership_type)?.label || partner?.partnership_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        partner?.is_active 
                          ? 'bg-green-100 text-green-800' :'bg-red-100 text-red-800'
                      }`}>
                        {partner?.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(partner)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePartner(partner?.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Create Partner Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Partner</h3>
            <form onSubmit={handleCreatePartner} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Partner Name *"
                  value={formData?.name}
                  onChange={(e) => setFormData({...formData, name: e?.target?.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <input
                  type="text"
                  placeholder="Company Name"
                  value={formData?.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e?.target?.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="email"
                  placeholder="Contact Email"
                  value={formData?.contact_email}
                  onChange={(e) => setFormData({...formData, contact_email: e?.target?.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="tel"
                  placeholder="Contact Phone"
                  value={formData?.contact_phone}
                  onChange={(e) => setFormData({...formData, contact_phone: e?.target?.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <textarea
                placeholder="Address"
                value={formData?.address}
                onChange={(e) => setFormData({...formData, address: e?.target?.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="2"
              />
              <input
                type="text"
                placeholder="Specialization"
                value={formData?.specialization}
                onChange={(e) => setFormData({...formData, specialization: e?.target?.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={formData?.partnership_type}
                onChange={(e) => setFormData({...formData, partnership_type: e?.target?.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {partnershipTypes?.map(type => (
                  <option key={type?.value} value={type?.value}>{type?.label}</option>
                ))}
              </select>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Partner Modal */}
      {showEditModal && selectedPartner && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Partner</h3>
            
            {/* Logo Upload Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Partner Logo</label>
              <ImageUpload
                bucketName="partner"
                onUploadSuccess={(url) => {
                  setSuccess('Logo uploaded successfully');
                  loadPartners();
                }}
                onUploadError={(error) => setError(error)}
                currentImageUrl={selectedPartner?.logo_url}
                userId={user?.id}
                folder="partners"
              />
            </div>

            <form onSubmit={handleEditPartner} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Partner Name *"
                  value={formData?.name}
                  onChange={(e) => setFormData({...formData, name: e?.target?.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <input
                  type="text"
                  placeholder="Company Name"
                  value={formData?.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e?.target?.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="email"
                  placeholder="Contact Email"
                  value={formData?.contact_email}
                  onChange={(e) => setFormData({...formData, contact_email: e?.target?.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="tel"
                  placeholder="Contact Phone"
                  value={formData?.contact_phone}
                  onChange={(e) => setFormData({...formData, contact_phone: e?.target?.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <textarea
                placeholder="Address"
                value={formData?.address}
                onChange={(e) => setFormData({...formData, address: e?.target?.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="2"
              />
              <input
                type="text"
                placeholder="Specialization"
                value={formData?.specialization}
                onChange={(e) => setFormData({...formData, specialization: e?.target?.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={formData?.partnership_type}
                onChange={(e) => setFormData({...formData, partnership_type: e?.target?.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {partnershipTypes?.map(type => (
                  <option key={type?.value} value={type?.value}>{type?.label}</option>
                ))}
              </select>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerManagement;