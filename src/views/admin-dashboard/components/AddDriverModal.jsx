import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { supabase } from '../../../lib/supabase';

const LICENSE_TYPES = ['Professional', 'Non-Professional', 'Student Permit'];
const VEHICLE_TYPES = ['Sedan', 'SUV', 'Van', 'Minibus', 'Bus', 'Motorcycle'];

const AddDriverModal = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    // Account
    full_name: '',
    email: '',
    password: '',
    phone: '',
    // Personal
    date_of_birth: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    // License
    license_number: '',
    license_type: 'Professional',
    license_expiry: '',
    // Vehicle
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_plate: '',
    vehicle_type: 'Sedan',
    vehicle_color: '',
    // Assignment
    partner_id: '',
    notes: '',
  });

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      const { data } = await supabase?.from('partners')?.select('id, name, company_name')?.order('name');
      setPartners(data || []);
    } catch (err) {
      console.error('Error loading partners:', err);
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form?.full_name?.trim()) return 'Full name is required.';
      if (!form?.email?.trim()) return 'Email is required.';
      if (!form?.password?.trim()) return 'Password is required.';
      if (form?.password?.length < 8) return 'Password must be at least 8 characters.';
      if (!form?.phone?.trim()) return 'Phone number is required.';
    }
    if (step === 2) {
      if (!form?.license_number?.trim()) return 'License number is required.';
      if (!form?.license_expiry) return 'License expiry date is required.';
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase?.auth?.signUp({
        email: form?.email?.trim()?.toLowerCase(),
        password: form?.password,
        options: {
          data: {
            full_name: form?.full_name?.trim(),
            role: 'driver',
          },
        },
      });

      if (authError) throw new Error(authError.message);
      if (!authData?.user?.id) throw new Error('Failed to create auth user.');

      const userId = authData?.user?.id;

      // 2. Upsert user profile
      await supabase?.rpc('admin_create_user_profile', {
        p_user_id: userId,
        p_email: form?.email?.trim()?.toLowerCase(),
        p_full_name: form?.full_name?.trim(),
        p_role: 'driver',
        p_phone: form?.phone?.trim() || null,
        p_staff_role_id: null,
        p_notes: form?.notes?.trim() || null,
        p_created_by: (await supabase?.auth?.getUser())?.data?.user?.id || null,
      });

      // 3. Create driver application record
      const { error: appError } = await supabase?.from('driver_applications')?.insert({
        user_id: userId,
        partner_id: form?.partner_id || null,
        full_name: form?.full_name?.trim(),
        email: form?.email?.trim()?.toLowerCase(),
        phone: form?.phone?.trim(),
        date_of_birth: form?.date_of_birth || null,
        address: form?.address?.trim() || null,
        emergency_contact_name: form?.emergency_contact_name?.trim() || null,
        emergency_contact_phone: form?.emergency_contact_phone?.trim() || null,
        license_number: form?.license_number?.trim(),
        license_type: form?.license_type,
        license_expiry: form?.license_expiry || null,
        vehicle_make: form?.vehicle_make?.trim() || null,
        vehicle_model: form?.vehicle_model?.trim() || null,
        vehicle_year: form?.vehicle_year ? parseInt(form?.vehicle_year) : null,
        vehicle_plate: form?.vehicle_plate?.trim() || null,
        vehicle_type: form?.vehicle_type,
        vehicle_color: form?.vehicle_color?.trim() || null,
        application_status: 'approved',
        kyc_status: 'pending',
        created_at: new Date()?.toISOString(),
        updated_at: new Date()?.toISOString(),
      });

      if (appError) console.warn('Driver application warning:', appError?.message);

      onSuccess?.(`Driver "${form?.full_name}" created and approved successfully.`);
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Failed to create driver. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Account' },
    { num: 2, label: 'License' },
    { num: 3, label: 'Vehicle' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <Icon name="Car" size={18} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Add New Driver</h3>
              <p className="text-xs text-gray-500">Create a driver account manually</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Icon name="X" size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center px-5 pt-4 pb-2 gap-2">
          {steps?.map((s, i) => (
            <React.Fragment key={s?.num}>
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  step > s?.num ? 'bg-green-500 text-white' :
                  step === s?.num ? 'bg-blue-600 text-white': 'bg-gray-200 text-gray-500'
                }`}>
                  {step > s?.num ? <Icon name="Check" size={12} /> : s?.num}
                </div>
                <span className={`text-xs font-medium ${step === s?.num ? 'text-blue-600' : 'text-gray-500'}`}>
                  {s?.label}
                </span>
              </div>
              {i < steps?.length - 1 && (
                <div className={`flex-1 h-px ${step > s?.num ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <Icon name="AlertCircle" size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Step 1: Account & Personal */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form?.full_name}
                  onChange={e => handleChange('full_name', e?.target?.value)}
                  placeholder="e.g. Pedro Santos"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form?.email}
                  onChange={e => handleChange('email', e?.target?.value)}
                  placeholder="driver@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form?.password}
                    onChange={e => handleChange('password', e?.target?.value)}
                    placeholder="Min. 8 characters"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={16} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form?.phone}
                  onChange={e => handleChange('phone', e?.target?.value)}
                  placeholder="+63 9XX XXX XXXX"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={form?.date_of_birth}
                    onChange={e => handleChange('date_of_birth', e?.target?.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Partner / Fleet</label>
                  <select
                    value={form?.partner_id}
                    onChange={e => handleChange('partner_id', e?.target?.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Independent</option>
                    {partners?.map(p => (
                      <option key={p?.id} value={p?.id}>{p?.name || p?.company_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={form?.address}
                  onChange={e => handleChange('address', e?.target?.value)}
                  placeholder="Home address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={form?.emergency_contact_name}
                    onChange={e => handleChange('emergency_contact_name', e?.target?.value)}
                    placeholder="Contact name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Phone</label>
                  <input
                    type="tel"
                    value={form?.emergency_contact_phone}
                    onChange={e => handleChange('emergency_contact_phone', e?.target?.value)}
                    placeholder="+63 9XX XXX XXXX"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: License */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form?.license_number}
                  onChange={e => handleChange('license_number', e?.target?.value)}
                  placeholder="e.g. N01-23-456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {LICENSE_TYPES?.map(lt => (
                    <button
                      key={lt}
                      type="button"
                      onClick={() => handleChange('license_type', lt)}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                        form?.license_type === lt
                          ? 'border-blue-500 bg-blue-50 text-blue-700' :'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {lt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form?.license_expiry}
                  onChange={e => handleChange('license_expiry', e?.target?.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form?.notes}
                  onChange={e => handleChange('notes', e?.target?.value)}
                  placeholder="Internal notes about this driver..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 3: Vehicle */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {VEHICLE_TYPES?.map(vt => (
                    <button
                      key={vt}
                      type="button"
                      onClick={() => handleChange('vehicle_type', vt)}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                        form?.vehicle_type === vt
                          ? 'border-green-500 bg-green-50 text-green-700' :'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {vt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                  <input
                    type="text"
                    value={form?.vehicle_make}
                    onChange={e => handleChange('vehicle_make', e?.target?.value)}
                    placeholder="e.g. Toyota"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input
                    type="text"
                    value={form?.vehicle_model}
                    onChange={e => handleChange('vehicle_model', e?.target?.value)}
                    placeholder="e.g. Innova"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={form?.vehicle_year}
                    onChange={e => handleChange('vehicle_year', e?.target?.value)}
                    placeholder="e.g. 2022"
                    min="2000"
                    max="2030"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="text"
                    value={form?.vehicle_color}
                    onChange={e => handleChange('vehicle_color', e?.target?.value)}
                    placeholder="e.g. White"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plate Number</label>
                <input
                  type="text"
                  value={form?.vehicle_plate}
                  onChange={e => handleChange('vehicle_plate', e?.target?.value?.toUpperCase())}
                  placeholder="e.g. ABC 1234"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Icon name="Info" size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    The driver account will be created with <strong>Approved</strong> status. 
                    KYC verification and document uploads can be completed later in the Drivers &amp; KYC tab.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => { setError(''); setStep(s => s - 1); }}
                className="flex-1"
                disabled={loading}
              >
                <Icon name="ChevronLeft" size={14} className="mr-1" />
                Back
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
                Cancel
              </Button>
            )}

            {step < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Next
                <Icon name="ChevronRight" size={14} className="ml-1" />
              </Button>
            ) : (
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Icon name="Loader2" size={14} className="animate-spin" />
                    Creating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Icon name="Car" size={14} />
                    Create Driver
                  </span>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDriverModal;
