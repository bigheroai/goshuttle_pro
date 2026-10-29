import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';
import { useAuth } from '../../../contexts/AuthContext';
import corporateBookingService from '../../../utils/corporateBookingService';
import { supabase } from '../../../lib/supabase';

const CarpoolBookingModal = ({ isOpen, onClose, onSuccess }) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [formData, setFormData] = useState({
    carpoolName: '',
    pickupLocation: '',
    dropoffLocation: '',
    pickupDate: '',
    pickupTime: '',
    vehicleId: '',
    maxSeats: 4,
    selectedEmployees: [],
    notes: '',
    splitCost: true,
  });

  useEffect(() => {
    if (isOpen) {
      loadEmployees();
      loadVehicles();
    }
  }, [isOpen]);

  const loadEmployees = async () => {
    try {
      if (userProfile?.company_id) {
        const { data } = await supabase
          ?.from('user_profiles')
          ?.select('id, full_name, email, department')
          ?.eq('company_id', userProfile?.company_id);
        setEmployees(data || []);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadVehicles = async () => {
    try {
      const data = await corporateBookingService?.getAvailableVehicles?.();
      setVehicles(data || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEmployeeToggle = (employeeId) => {
    setFormData(prev => {
      const already = prev?.selectedEmployees?.includes(employeeId);
      if (!already && prev?.selectedEmployees?.length >= prev?.maxSeats) return prev;
      return {
        ...prev,
        selectedEmployees: already
          ? prev?.selectedEmployees?.filter(id => id !== employeeId)
          : [...prev?.selectedEmployees, employeeId],
      };
    });
  };

  const selectedVehicle = vehicles?.find(v => v?.id === formData?.vehicleId);
  const estimatedCostPerPerson =
    formData?.splitCost && formData?.selectedEmployees?.length > 0 && selectedVehicle?.dailyRate
      ? (parseFloat(selectedVehicle?.dailyRate) / formData?.selectedEmployees?.length)?.toFixed(2)
      : selectedVehicle?.dailyRate || '—';

  const handleSubmit = async () => {
    if (
      !formData?.carpoolName ||
      !formData?.pickupLocation ||
      !formData?.dropoffLocation ||
      !formData?.pickupDate ||
      !formData?.vehicleId ||
      formData?.selectedEmployees?.length === 0
    ) {
      alert('Please fill in all required fields and select at least one employee.');
      return;
    }

    try {
      setLoading(true);
      const pickupDateTime = new Date(`${formData.pickupDate}T${formData.pickupTime || '09:00'}`);

      const bulkBookingData = {
        companyId: userProfile?.company_id || userProfile?.companyId,
        createdBy: userProfile?.id,
        bookingName: formData?.carpoolName,
        pickupLocation: formData?.pickupLocation,
        dropoffLocation: formData?.dropoffLocation,
        pickupDate: pickupDateTime?.toISOString(),
        vehicleId: formData?.vehicleId,
        employeeIds: formData?.selectedEmployees,
        notes: `[CARPOOL] ${formData?.notes || ''} | Split cost: ${formData?.splitCost ? 'Yes' : 'No'} | Seats: ${formData?.maxSeats}`,
      };

      await corporateBookingService?.createBulkBooking?.(bulkBookingData);
      onSuccess?.();
      onClose?.();
      resetForm();
    } catch (error) {
      console.error('Error creating carpool booking:', error);
      alert('Failed to create carpool booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      carpoolName: '',
      pickupLocation: '',
      dropoffLocation: '',
      pickupDate: '',
      pickupTime: '',
      vehicleId: '',
      maxSeats: 4,
      selectedEmployees: [],
      notes: '',
      splitCost: true,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                <Icon name="Users" size={20} className="text-teal-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Carpool Booking</h3>
                <p className="text-xs text-gray-500">Share a ride, split the cost</p>
              </div>
            </div>
            <button
              onClick={() => { onClose?.(); resetForm(); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Icon name="X" size={18} className="text-gray-500" />
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3]?.map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                  step >= s ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {s}
                </div>
                {i < 2 && (
                  <div className={`h-0.5 w-16 mx-1 transition-colors ${step > s ? 'bg-teal-600' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Route & Vehicle */}
          {step === 1 && (
            <div className="space-y-5">
              <h4 className="text-base font-semibold text-gray-800">Route & Vehicle Details</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Carpool Name *"
                  value={formData?.carpoolName}
                  onChange={(e) => handleInputChange('carpoolName', e?.target?.value)}
                  placeholder="e.g., Morning Office Carpool"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle *</label>
                  <select
                    value={formData?.vehicleId}
                    onChange={(e) => handleInputChange('vehicleId', e?.target?.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  >
                    <option value="">Select a vehicle</option>
                    {vehicles?.map(v => (
                      <option key={v?.id} value={v?.id}>
                        {v?.name} ({v?.capacity} seats) — ₱{v?.dailyRate}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Pickup Location *"
                  value={formData?.pickupLocation}
                  onChange={(e) => handleInputChange('pickupLocation', e?.target?.value)}
                  placeholder="Enter pickup address"
                />

                <Input
                  label="Drop-off Location *"
                  value={formData?.dropoffLocation}
                  onChange={(e) => handleInputChange('dropoffLocation', e?.target?.value)}
                  placeholder="Enter destination address"
                />

                <Input
                  label="Date *"
                  type="date"
                  value={formData?.pickupDate}
                  onChange={(e) => handleInputChange('pickupDate', e?.target?.value)}
                  min={new Date()?.toISOString()?.split('T')?.[0]}
                />

                <Input
                  label="Time"
                  type="time"
                  value={formData?.pickupTime}
                  onChange={(e) => handleInputChange('pickupTime', e?.target?.value)}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Seats</label>
                  <select
                    value={formData?.maxSeats}
                    onChange={(e) => handleInputChange('maxSeats', parseInt(e?.target?.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  >
                    {[2, 3, 4, 5, 6, 7, 8]?.map(n => (
                      <option key={n} value={n}>{n} passengers</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={() => handleInputChange('splitCost', !formData?.splitCost)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      formData?.splitCost ? 'bg-teal-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData?.splitCost ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                  <span className="text-sm text-gray-700">Split cost equally among passengers</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                <textarea
                  value={formData?.notes}
                  onChange={(e) => handleInputChange('notes', e?.target?.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  rows="2"
                  placeholder="Any special instructions for the carpool..."
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  Next: Select Passengers
                  <Icon name="ChevronRight" size={16} className="ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Employee Selection */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-gray-800">Select Passengers</h4>
                <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  {formData?.selectedEmployees?.length} / {formData?.maxSeats} seats filled
                </span>
              </div>

              {/* Seat capacity bar */}
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-teal-500 h-2 rounded-full transition-all"
                  style={{ width: `${(formData?.selectedEmployees?.length / formData?.maxSeats) * 100}%` }}
                />
              </div>

              {employees?.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Icon name="Users" size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No team members found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                  {employees?.map(emp => {
                    const selected = formData?.selectedEmployees?.includes(emp?.id);
                    const disabled = !selected && formData?.selectedEmployees?.length >= formData?.maxSeats;
                    return (
                      <div
                        key={emp?.id}
                        onClick={() => !disabled && handleEmployeeToggle(emp?.id)}
                        className={`flex items-center justify-between p-3 border rounded-xl transition-all ${
                          selected
                            ? 'border-teal-500 bg-teal-50'
                            : disabled
                            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed' :'border-gray-200 hover:border-teal-300 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            selected ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {emp?.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{emp?.full_name}</p>
                            <p className="text-xs text-gray-500">{emp?.department || emp?.email}</p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          selected ? 'border-teal-600 bg-teal-600' : 'border-gray-300'
                        }`}>
                          {selected && <Icon name="Check" size={11} className="text-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <Icon name="ChevronLeft" size={16} className="mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={formData?.selectedEmployees?.length === 0}
                  className="bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50"
                >
                  Next: Review
                  <Icon name="ChevronRight" size={16} className="ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Confirm */}
          {step === 3 && (
            <div className="space-y-5">
              <h4 className="text-base font-semibold text-gray-800">Review Carpool Booking</h4>

              <div className="bg-teal-50 border border-teal-100 rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Carpool Name</p>
                    <p className="text-sm font-semibold text-gray-900">{formData?.carpoolName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Vehicle</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedVehicle?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Route</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formData?.pickupLocation} → {formData?.dropoffLocation}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Date & Time</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formData?.pickupDate
                        ? new Date(`${formData.pickupDate}T${formData.pickupTime || '09:00'}`)?.toLocaleString('en-PH', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* Cost Split Banner */}
                <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-teal-200">
                  <div className="flex items-center space-x-2">
                    <Icon name="CreditCard" size={16} className="text-teal-600" />
                    <span className="text-sm text-gray-700">
                      {formData?.splitCost ? 'Cost split equally' : 'Full cost per booking'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {formData?.splitCost ? 'Per person' : 'Total'}
                    </p>
                    <p className="text-base font-bold text-teal-700">₱{estimatedCostPerPerson}</p>
                  </div>
                </div>

                {/* Passengers */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                    Passengers ({formData?.selectedEmployees?.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {formData?.selectedEmployees?.map(empId => {
                      const emp = employees?.find(e => e?.id === empId);
                      return (
                        <span
                          key={empId}
                          className="inline-flex items-center space-x-1.5 bg-white border border-teal-200 text-teal-800 text-xs font-medium px-2.5 py-1 rounded-full"
                        >
                          <span className="w-4 h-4 bg-teal-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                            {emp?.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                          <span>{emp?.full_name}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {formData?.notes && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Notes</p>
                    <p className="text-sm text-gray-700">{formData?.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <Icon name="ChevronLeft" size={16} className="mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {loading ? (
                    <>
                      <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Icon name="Users" size={16} className="mr-2" />
                      Confirm Carpool
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CarpoolBookingModal;
