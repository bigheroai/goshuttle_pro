import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ID_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver\'s License" },
  { value: 'national_id', label: 'National ID (PhilSys)' },
  { value: 'sss', label: 'SSS ID' },
  { value: 'gsis', label: 'GSIS ID' },
  { value: 'prc', label: 'PRC ID' },
  { value: 'voters_id', label: "Voter\'s ID" },
  { value: 'postal_id', label: 'Postal ID' },
];

const KYC_STATUS_CONFIG = {
  not_submitted: { label: 'Not Submitted', color: 'text-gray-500 bg-gray-100', icon: 'AlertCircle' },
  pending: { label: 'Under Review', color: 'text-yellow-700 bg-yellow-100', icon: 'Clock' },
  approved: { label: 'Verified', color: 'text-green-700 bg-green-100', icon: 'CheckCircle' },
  rejected: { label: 'Rejected', color: 'text-red-700 bg-red-100', icon: 'XCircle' },
};

const KYCVerification = () => {
  const { user } = useAuth();
  const [kycData, setKycData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingField, setUploadingField] = useState(null);

  const [formData, setFormData] = useState({
    id_type: '',
    id_number: '',
    id_front_url: '',
    id_back_url: '',
    selfie_url: '',
    address_line1: '',
    address_line2: '',
    city: '',
    province: '',
    postal_code: '',
    proof_of_address_url: '',
  });

  const idFrontRef = useRef(null);
  const idBackRef = useRef(null);
  const selfieRef = useRef(null);
  const proofRef = useRef(null);

  useEffect(() => {
    if (user?.id) loadKYC();
  }, [user?.id]);

  const loadKYC = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        ?.from('user_kyc')
        ?.select('*')
        ?.eq('user_id', user?.id)
        ?.eq('kyc_type', 'customer')
        ?.single();

      if (data && !error) {
        setKycData(data);
        setFormData({
          id_type: data?.id_type || '',
          id_number: data?.id_number || '',
          id_front_url: data?.id_front_url || '',
          id_back_url: data?.id_back_url || '',
          selfie_url: data?.selfie_url || '',
          address_line1: data?.address_line1 || '',
          address_line2: data?.address_line2 || '',
          city: data?.city || '',
          province: data?.province || '',
          postal_code: data?.postal_code || '',
          proof_of_address_url: data?.proof_of_address_url || '',
        });
      }
    } catch (err) {
      console.error('Error loading KYC:', err);
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file, fieldName) => {
    if (!file || !user?.id) return null;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes?.includes(file?.type)) {
      setError('Please upload a valid image or PDF file.');
      return null;
    }
    if (file?.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return null;
    }

    try {
      setUploadingField(fieldName);
      const ext = file?.name?.split('.')?.pop();
      const filePath = `${user?.id}/${fieldName}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase?.storage
        ?.from('kyc-documents')
        ?.upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: signedData, error: urlError } = await supabase?.storage
        ?.from('kyc-documents')
        ?.createSignedUrl(filePath, 60 * 60 * 24 * 365);

      if (urlError) throw urlError;
      return signedData?.signedUrl;
    } catch (err) {
      setError(`Failed to upload ${fieldName}: ${err?.message}`);
      return null;
    } finally {
      setUploadingField(null);
    }
  };

  const handleFileChange = async (e, fieldName) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setError('');
    const url = await uploadDocument(file, fieldName);
    if (url) {
      setFormData(prev => ({ ...prev, [`${fieldName}_url`]: url }));
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!user?.id) return;

    if (!formData?.id_type || !formData?.id_number) {
      setError('Please fill in the ID type and ID number.');
      return;
    }
    if (!formData?.id_front_url) {
      setError('Please upload the front of your ID.');
      return;
    }
    if (!formData?.selfie_url) {
      setError('Please upload a selfie with your ID.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        user_id: user?.id,
        kyc_type: 'customer',
        ...formData,
        kyc_status: 'pending',
        submitted_at: new Date()?.toISOString(),
        updated_at: new Date()?.toISOString(),
      };

      let result;
      if (kycData?.id) {
        result = await supabase
          ?.from('user_kyc')
          ?.update(payload)
          ?.eq('id', kycData?.id)
          ?.select()
          ?.single();
      } else {
        result = await supabase
          ?.from('user_kyc')
          ?.insert(payload)
          ?.select()
          ?.single();
      }

      if (result?.error) throw result?.error;

      // Update kyc_status on user_profiles
      await supabase
        ?.from('user_profiles')
        ?.update({ kyc_status: 'pending', updated_at: new Date()?.toISOString() })
        ?.eq('id', user?.id);

      setKycData(result?.data);
      setSuccess('KYC documents submitted successfully! We will review your submission within 1-3 business days.');
    } catch (err) {
      setError(`Failed to submit KYC: ${err?.message}`);
    } finally {
      setSaving(false);
    }
  };

  const statusConfig = KYC_STATUS_CONFIG?.[kycData?.kyc_status] || KYC_STATUS_CONFIG?.not_submitted;
  const isApproved = kycData?.kyc_status === 'approved';
  const isPending = kycData?.kyc_status === 'pending';

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <Icon name="Loader2" className="animate-spin mr-2" size={24} />
          <span className="text-gray-600">Loading KYC status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Icon name="ShieldCheck" size={24} className="text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Identity Verification (KYC)</h3>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusConfig?.color}`}>
            <Icon name={statusConfig?.icon} size={14} />
            {statusConfig?.label}
          </span>
        </div>

        {isApproved && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <Icon name="CheckCircle" size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-800">Identity Verified</p>
              <p className="text-sm text-green-700 mt-1">Your identity has been successfully verified. You have full access to all GoShuttle features.</p>
            </div>
          </div>
        )}

        {isPending && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <Icon name="Clock" size={20} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-800">Verification Under Review</p>
              <p className="text-sm text-yellow-700 mt-1">Your documents are being reviewed. This typically takes 1-3 business days.</p>
            </div>
          </div>
        )}

        {kycData?.kyc_status === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <Icon name="XCircle" size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">Verification Rejected</p>
              {kycData?.rejection_reason && (
                <p className="text-sm text-red-700 mt-1">Reason: {kycData?.rejection_reason}</p>
              )}
              <p className="text-sm text-red-700 mt-1">Please resubmit with correct documents.</p>
            </div>
          </div>
        )}

        {!kycData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <Icon name="Info" size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-800">Verify Your Identity</p>
              <p className="text-sm text-blue-700 mt-1">Complete KYC verification to unlock all features and build trust with drivers.</p>
            </div>
          </div>
        )}
      </div>

      {/* KYC Form - show if not approved or if rejected */}
      {!isApproved && !isPending && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          {/* ID Information */}
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Icon name="CreditCard" size={18} className="text-blue-500" />
              Government-Issued ID
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Type *</label>
                <select
                  value={formData?.id_type}
                  onChange={e => setFormData(prev => ({ ...prev, id_type: e?.target?.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  required
                >
                  <option value="">Select ID type</option>
                  {ID_TYPES?.map(t => (
                    <option key={t?.value} value={t?.value}>{t?.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Number *</label>
                <input
                  type="text"
                  value={formData?.id_number}
                  onChange={e => setFormData(prev => ({ ...prev, id_number: e?.target?.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="Enter your ID number"
                  required
                />
              </div>
            </div>

            {/* Document Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {/* ID Front */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Front *</label>
                <input ref={idFrontRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFileChange(e, 'id_front')} />
                <div
                  onClick={() => idFrontRef?.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${formData?.id_front_url ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-primary hover:bg-blue-50'}`}
                >
                  {uploadingField === 'id_front' ? (
                    <Icon name="Loader2" size={24} className="animate-spin mx-auto text-primary" />
                  ) : formData?.id_front_url ? (
                    <Icon name="CheckCircle" size={24} className="mx-auto text-green-500" />
                  ) : (
                    <Icon name="Upload" size={24} className="mx-auto text-gray-400" />
                  )}
                  <p className="text-xs text-gray-600 mt-1">
                    {formData?.id_front_url ? 'Uploaded ✓' : 'Click to upload'}
                  </p>
                </div>
              </div>

              {/* ID Back */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Back</label>
                <input ref={idBackRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFileChange(e, 'id_back')} />
                <div
                  onClick={() => idBackRef?.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${formData?.id_back_url ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-primary hover:bg-blue-50'}`}
                >
                  {uploadingField === 'id_back' ? (
                    <Icon name="Loader2" size={24} className="animate-spin mx-auto text-primary" />
                  ) : formData?.id_back_url ? (
                    <Icon name="CheckCircle" size={24} className="mx-auto text-green-500" />
                  ) : (
                    <Icon name="Upload" size={24} className="mx-auto text-gray-400" />
                  )}
                  <p className="text-xs text-gray-600 mt-1">
                    {formData?.id_back_url ? 'Uploaded ✓' : 'Click to upload'}
                  </p>
                </div>
              </div>

              {/* Selfie with ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Selfie with ID *</label>
                <input ref={selfieRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'selfie')} />
                <div
                  onClick={() => selfieRef?.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${formData?.selfie_url ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-primary hover:bg-blue-50'}`}
                >
                  {uploadingField === 'selfie' ? (
                    <Icon name="Loader2" size={24} className="animate-spin mx-auto text-primary" />
                  ) : formData?.selfie_url ? (
                    <Icon name="CheckCircle" size={24} className="mx-auto text-green-500" />
                  ) : (
                    <Icon name="Camera" size={24} className="mx-auto text-gray-400" />
                  )}
                  <p className="text-xs text-gray-600 mt-1">
                    {formData?.selfie_url ? 'Uploaded ✓' : 'Hold ID next to face'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Icon name="MapPin" size={18} className="text-blue-500" />
              Address Information
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={formData?.address_line1}
                  onChange={e => setFormData(prev => ({ ...prev, address_line1: e?.target?.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="House/Unit No., Street Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={formData?.address_line2}
                  onChange={e => setFormData(prev => ({ ...prev, address_line2: e?.target?.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="Barangay, Subdivision"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City/Municipality</label>
                  <input
                    type="text"
                    value={formData?.city}
                    onChange={e => setFormData(prev => ({ ...prev, city: e?.target?.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                  <input
                    type="text"
                    value={formData?.province}
                    onChange={e => setFormData(prev => ({ ...prev, province: e?.target?.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    placeholder="Province"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={formData?.postal_code}
                    onChange={e => setFormData(prev => ({ ...prev, postal_code: e?.target?.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    placeholder="0000"
                  />
                </div>
              </div>

              {/* Proof of Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Proof of Address (optional)</label>
                <p className="text-xs text-gray-500 mb-2">Utility bill, bank statement, or government document showing your address</p>
                <input ref={proofRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFileChange(e, 'proof_of_address')} />
                <button
                  type="button"
                  onClick={() => proofRef?.current?.click()}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-colors ${formData?.proof_of_address_url ? 'border-green-400 text-green-700 bg-green-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  {uploadingField === 'proof_of_address' ? (
                    <Icon name="Loader2" size={16} className="animate-spin" />
                  ) : formData?.proof_of_address_url ? (
                    <Icon name="CheckCircle" size={16} />
                  ) : (
                    <Icon name="Upload" size={16} />
                  )}
                  {formData?.proof_of_address_url ? 'Document Uploaded ✓' : 'Upload Proof of Address'}
                </button>
              </div>
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <Icon name="AlertCircle" size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
              <Icon name="CheckCircle" size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <><Icon name="Loader2" size={16} className="animate-spin mr-2" />Submitting...</>
              ) : (
                <><Icon name="ShieldCheck" size={16} className="mr-2" />Submit for Verification</>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Show submitted data summary if pending */}
      {isPending && kycData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="text-base font-semibold text-gray-900 mb-4">Submitted Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">ID Type:</span>
              <span className="ml-2 font-medium text-gray-900">
                {ID_TYPES?.find(t => t?.value === kycData?.id_type)?.label || kycData?.id_type}
              </span>
            </div>
            <div>
              <span className="text-gray-500">ID Number:</span>
              <span className="ml-2 font-medium text-gray-900">{kycData?.id_number}</span>
            </div>
            <div>
              <span className="text-gray-500">Submitted:</span>
              <span className="ml-2 font-medium text-gray-900">
                {kycData?.submitted_at ? new Date(kycData?.submitted_at)?.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Documents:</span>
              <span className="ml-2 font-medium text-gray-900">
                {[kycData?.id_front_url && 'ID Front', kycData?.id_back_url && 'ID Back', kycData?.selfie_url && 'Selfie', kycData?.proof_of_address_url && 'Proof of Address']?.filter(Boolean)?.join(', ')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KYCVerification;
