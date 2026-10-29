import React, { useState, useEffect } from 'react';
import { User, Building2, Upload, Edit, Save, X, AlertCircle, Check } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import ImageUpload from './ImageUpload';
import { partnerStorageService } from '../utils/partnerStorageService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const PartnerProfileManager = ({ partnerId, onProfileUpdate }) => {
  const { user } = useAuth();
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    department: '',
    company_id: ''
  });

  useEffect(() => {
    if (partnerId) {
      loadPartnerProfile();
    }
  }, [partnerId]);

  const loadPartnerProfile = async () => {
    try {
      setLoading(true);
      const { data, error: partnerError } = await partnerStorageService?.getPartnerWithImages(partnerId);
      
      if (partnerError) {
        throw new Error(partnerError);
      }

      setPartner(data);
      setFormData({
        full_name: data?.full_name || '',
        email: data?.email || '',
        phone: data?.phone || '',
        department: data?.department || '',
        company_id: data?.company_id || ''
      });
    } catch (err) {
      setError(err?.message || 'Failed to load partner profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e?.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(false);
  };

  const handleProfileImageUpload = async (imageData) => {
    // Reload partner profile to get updated image URL
    await loadPartnerProfile();
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    
    if (onProfileUpdate) {
      onProfileUpdate(partnerId);
    }
  };

  const handleProfileImageError = (error) => {
    setError(`Profile image upload failed: ${error}`);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        ?.from('user_profiles')
        ?.update({
          full_name: formData?.full_name,
          phone: formData?.phone,
          department: formData?.department,
          updated_at: new Date()?.toISOString()
        })
        ?.eq('id', partnerId);

      if (updateError) {
        throw new Error(updateError?.message);
      }

      setEditing(false);
      setSuccess(true);
      await loadPartnerProfile();
      
      if (onProfileUpdate) {
        onProfileUpdate(partnerId);
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setFormData({
      full_name: partner?.full_name || '',
      email: partner?.email || '',
      phone: partner?.phone || '',
      department: partner?.department || '',
      company_id: partner?.company_id || ''
    });
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Partner profile not found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Partner Profile</h3>
        {!editing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <Check className="w-5 h-5 text-green-500" />
          <p className="text-sm font-medium text-green-800">Profile updated successfully!</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Profile Image Section */}
        <div className="border-b border-gray-200 pb-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Profile Image</h4>
          <ImageUpload
            bucketName="partner"
            userId={user?.id}
            folder={`partner-${partnerId}`}
            currentImageUrl={partner?.avatar_url}
            onUploadSuccess={handleProfileImageUpload}
            onUploadError={handleProfileImageError}
            maxSizeText="8MB"
            title="Partner Profile Picture"
            description="Upload a professional profile picture"
          />
        </div>

        {/* Profile Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Profile Information</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              {editing ? (
                <Input
                  name="full_name"
                  value={formData?.full_name}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                  icon={<User className="w-4 h-4 text-gray-400" />}
                />
              ) : (
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                  {partner?.full_name || 'Not provided'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                {partner?.email || 'Not provided'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Email changes require admin approval
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              {editing ? (
                <Input
                  name="phone"
                  value={formData?.phone}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                />
              ) : (
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                  {partner?.phone || 'Not provided'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              {editing ? (
                <Input
                  name="department"
                  value={formData?.department}
                  onChange={handleInputChange}
                  placeholder="Enter department"
                  icon={<Building2 className="w-4 h-4 text-gray-400" />}
                />
              ) : (
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                  {partner?.department || 'Not provided'}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg inline-block">
              {partner?.role === 'corporate_manager' ? 'Corporate Manager' : partner?.role}
            </p>
          </div>

          {/* Action Buttons (when editing) */}
          {editing && (
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={saving}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartnerProfileManager;