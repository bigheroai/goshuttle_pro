import React, { useState, useEffect } from 'react';
import { driverSignupService } from '../../../services/driverService';
import { X, Calendar, Phone, Mail, User, FileText, Building, Truck } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import notificationService from '../../../services/notificationService';

export default function DriverSignupModal({ isOpen, onClose, onSignupSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [partners, setPartners] = useState([]);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    licenseNumber: '',
    licenseExpiry: '',
    partnerId: '',
    fleetType: 'goshuttle_main',
    documents: []
  });

  useEffect(() => {
    if (isOpen) {
      loadPartners();
      // Reset form when modal opens
      setFormData({
        email: '',
        fullName: '',
        phone: '',
        licenseNumber: '',
        licenseExpiry: '',
        partnerId: '',
        fleetType: 'goshuttle_main',
        documents: []
      });
      setError('');
    }
  }, [isOpen]);

  const loadPartners = async () => {
    try {
      const { data, error } = await supabase?.from('partners')?.select('id, name, company_name')?.eq('is_active', true)?.order('name');

      if (error) throw error;
      setPartners(data || []);
    } catch (err) {
      console.error('Error loading partners:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e?.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-clear partner selection if switching to GoShuttle main fleet
    if (name === 'fleetType' && value === 'goshuttle_main') {
      setFormData(prev => ({
        ...prev,
        partnerId: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    // Validation
    if (!formData?.email || !formData?.fullName || !formData?.phone || 
        !formData?.licenseNumber || !formData?.licenseExpiry) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData?.fleetType === 'partner_fleet' && !formData?.partnerId) {
      setError('Please select a partner fleet');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const signupData = {
        email: formData?.email,
        fullName: formData?.fullName,
        phone: formData?.phone,
        licenseNumber: formData?.licenseNumber,
        licenseExpiry: formData?.licenseExpiry,
        partnerId: formData?.fleetType === 'partner_fleet' ? formData?.partnerId : null,
        fleetType: formData?.fleetType,
        documents: formData?.documents
      };

      const result = await driverSignupService?.submitSignup(signupData);

      // Send driver signup notifications to all configured role recipients
      const selectedPartner = partners?.find(p => p?.id === formData?.partnerId);
      notificationService?.sendDriverSignupNotification({
        ...signupData,
        partnerName: selectedPartner?.company_name || selectedPartner?.name || null,
      })?.catch(err => console.warn('Driver signup notification failed (non-blocking):', err));
      
      onSignupSuccess?.(result);
      onClose();
    } catch (err) {
      setError(err?.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Driver Signup Request</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <X className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData?.fullName}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData?.email}
                      onChange={handleInputChange}
                      required
                      placeholder="your@email.com"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData?.phone}
                      onChange={handleInputChange}
                      required
                      placeholder="+63 917 123 4567"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* License Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                License Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Driver's License Number *
                  </label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={formData?.licenseNumber}
                    onChange={handleInputChange}
                    required
                    placeholder="DL-123456789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    License Expiry Date *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      name="licenseExpiry"
                      value={formData?.licenseExpiry}
                      onChange={handleInputChange}
                      required
                      min={new Date()?.toISOString()?.split('T')?.[0]}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fleet Selection */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                Fleet Selection
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Choose Fleet Type *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData?.fleetType === 'goshuttle_main' ?'border-blue-500 bg-blue-50' :'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, fleetType: 'goshuttle_main', partnerId: '' }))}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="fleetType"
                          value="goshuttle_main"
                          checked={formData?.fleetType === 'goshuttle_main'}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div>
                          <div className="font-medium text-gray-900">GoShuttle Main Fleet</div>
                          <div className="text-sm text-gray-600">Join the official GoShuttle driver network</div>
                        </div>
                      </div>
                    </div>
                    
                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData?.fleetType === 'partner_fleet' ?'border-purple-500 bg-purple-50' :'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, fleetType: 'partner_fleet' }))}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="fleetType"
                          value="partner_fleet"
                          checked={formData?.fleetType === 'partner_fleet'}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Partner Fleet</div>
                          <div className="text-sm text-gray-600">Join a partner transportation company</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {formData?.fleetType === 'partner_fleet' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Partner Fleet *
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <select
                        name="partnerId"
                        value={formData?.partnerId}
                        onChange={handleInputChange}
                        required={formData?.fleetType === 'partner_fleet'}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">Choose a partner fleet...</option>
                        {partners?.map((partner) => (
                          <option key={partner?.id} value={partner?.id}>
                            {partner?.name} - {partner?.company_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Information Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Application Process</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your application will be reviewed by our team</li>
                <li>• You may be contacted for additional documentation</li>
                <li>• Background check and vehicle inspection may be required</li>
                <li>• Approval process typically takes 2-5 business days</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}