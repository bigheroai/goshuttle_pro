import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';
import { useAuth } from '../../../contexts/AuthContext';
import corporateBookingService from '../../../utils/corporateBookingService';
import corporateEmailService from '../../../services/corporateEmailService';
import InvoiceReceiptModal from './InvoiceReceiptModal';

const BulkBookingModal = ({ isOpen, onClose, onSuccess }) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [formData, setFormData] = useState({
    bookingName: '',
    pickupLocation: '',
    dropoffLocation: '',
    pickupDate: '',
    pickupTime: '',
    vehicleId: '',
    selectedEmployees: [],
    notes: ''
  });
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    department: ''
  });
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    if (isOpen && userProfile?.companyId) {
      loadEmployees();
      loadVehicles();
    }
  }, [isOpen, userProfile]);

  const loadEmployees = async () => {
    try {
      const data = await corporateBookingService?.getCompanyEmployees(userProfile?.companyId);
      setEmployees(data);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadVehicles = async () => {
    try {
      const data = await corporateBookingService?.getAvailableVehicles();
      setVehicles(data);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEmployeeSelection = (employeeId) => {
    setFormData(prev => ({
      ...prev,
      selectedEmployees: prev?.selectedEmployees?.includes(employeeId)
        ? prev?.selectedEmployees?.filter(id => id !== employeeId)
        : [...prev?.selectedEmployees, employeeId]
    }));
  };

  const handleAddEmployee = async () => {
    if (!newEmployee?.name || !newEmployee?.email) {
      alert('Please fill in employee name and email');
      return;
    }

    try {
      setLoading(true);
      await corporateBookingService?.addEmployee(userProfile?.companyId, newEmployee);
      setNewEmployee({ name: '', email: '', department: '' });
      await loadEmployees();
    } catch (error) {
      console.error('Error adding employee:', error);
      alert('Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData?.bookingName || !formData?.pickupLocation || !formData?.dropoffLocation || 
        !formData?.pickupDate || !formData?.vehicleId || formData?.selectedEmployees?.length === 0) {
      alert('Please fill in all required fields and select at least one employee');
      return;
    }

    try {
      setLoading(true);
      const pickupDateTime = new Date(`${formData.pickupDate}T${formData.pickupTime || '09:00'}`);
      
      const bulkBookingData = {
        companyId: userProfile?.companyId,
        createdBy: userProfile?.id,
        bookingName: formData?.bookingName,
        pickupLocation: formData?.pickupLocation,
        dropoffLocation: formData?.dropoffLocation,
        pickupDate: pickupDateTime?.toISOString(),
        vehicleId: formData?.vehicleId,
        employeeIds: formData?.selectedEmployees,
        notes: formData?.notes
      };

      const result = await corporateBookingService?.createBulkBooking(bulkBookingData);

      const selectedVehicle = vehicles?.find(v => v?.id === formData?.vehicleId);
      const bookingForInvoice = {
        id: result?.bulkBooking?.id || 'BULK-' + Date.now(),
        bookingCode: result?.bulkBooking?.bookingName || formData?.bookingName,
        pickupLocation: formData?.pickupLocation,
        dropoffLocation: formData?.dropoffLocation,
        pickupDate: pickupDateTime?.toISOString(),
        vehicleName: selectedVehicle?.name || 'Selected Vehicle',
        passengerCount: formData?.selectedEmployees?.length,
        notes: formData?.notes,
        totalCost: selectedVehicle?.dailyRate ? parseFloat(selectedVehicle?.dailyRate) * formData?.selectedEmployees?.length : 0,
        status: 'confirmed',
        createdAt: new Date()?.toISOString(),
      };

      // Send booking confirmation email
      if (userProfile?.email) {
        corporateEmailService?.sendBookingConfirmation({
          booking: bookingForInvoice,
          recipientEmail: userProfile?.email,
          recipientName: userProfile?.full_name || userProfile?.fullName || '',
          companyName: userProfile?.company_name || userProfile?.companyName || ''
        })?.catch(err => console.warn('Booking confirmation email failed:', err));
      }

      setConfirmedBooking(bookingForInvoice);
      setShowInvoice(true);
      onSuccess?.();

      setStep(1);
      setFormData({
        bookingName: '',
        pickupLocation: '',
        dropoffLocation: '',
        pickupDate: '',
        pickupTime: '',
        vehicleId: '',
        selectedEmployees: [],
        notes: ''
      });
    } catch (error) {
      console.error('Error creating bulk booking:', error);
      alert('Failed to create bulk booking');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen && !showInvoice) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Bulk Booking</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  iconName="X"
                />
              </div>

              {/* Step Indicator */}
              <div className="flex items-center justify-center mb-8">
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    step >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    1
                  </div>
                  <div className={`h-0.5 w-16 ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`}></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    step >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    2
                  </div>
                  <div className={`h-0.5 w-16 ${step >= 3 ? 'bg-primary' : 'bg-gray-200'}`}></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    step >= 3 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    3
                  </div>
                </div>
              </div>

              {/* Step 1: Booking Details */}
              {step === 1 && (
                <div className="space-y-6">
                  <h4 className="text-lg font-medium text-gray-900">Booking Details</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Booking Name *"
                      value={formData?.bookingName}
                      onChange={(e) => handleInputChange('bookingName', e?.target?.value)}
                      placeholder="e.g., Team Outing Transport"
                    />
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle *</label>
                      <select
                        value={formData?.vehicleId}
                        onChange={(e) => handleInputChange('vehicleId', e?.target?.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select Vehicle</option>
                        {vehicles?.map(vehicle => (
                          <option key={vehicle?.id} value={vehicle?.id}>
                            {vehicle?.name} ({vehicle?.capacity} seats) - ₱{vehicle?.dailyRate}
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
                      label="Dropoff Location *"
                      value={formData?.dropoffLocation}
                      onChange={(e) => handleInputChange('dropoffLocation', e?.target?.value)}
                      placeholder="Enter destination address"
                    />

                    <Input
                      label="Pickup Date *"
                      type="date"
                      value={formData?.pickupDate}
                      onChange={(e) => handleInputChange('pickupDate', e?.target?.value)}
                      min={new Date()?.toISOString()?.split('T')?.[0]}
                    />
                    
                    <Input
                      label="Pickup Time"
                      type="time"
                      value={formData?.pickupTime}
                      onChange={(e) => handleInputChange('pickupTime', e?.target?.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      value={formData?.notes}
                      onChange={(e) => handleInputChange('notes', e?.target?.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      rows="3"
                      placeholder="Additional instructions or notes..."
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => setStep(2)}>
                      Next: Select Employees
                      <Icon name="ChevronRight" size={16} className="ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Employee Selection */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-medium text-gray-900">Select Employees</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStep(2.5)}
                    >
                      <Icon name="Plus" size={16} className="mr-2" />
                      Add Employee
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                    {employees?.map(employee => (
                      <div
                        key={employee?.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          formData?.selectedEmployees?.includes(employee?.id)
                            ? 'border-primary bg-primary/10' :'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleEmployeeSelection(employee?.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">{employee?.name}</h5>
                            <p className="text-sm text-gray-600">{employee?.email}</p>
                            {employee?.department && (
                              <p className="text-xs text-gray-500 mt-1">{employee?.department}</p>
                            )}
                          </div>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            formData?.selectedEmployees?.includes(employee?.id)
                              ? 'border-primary bg-primary' :'border-gray-300'
                          }`}>
                            {formData?.selectedEmployees?.includes(employee?.id) && (
                              <Icon name="Check" size={12} className="text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-sm text-gray-600">
                    Selected: {formData?.selectedEmployees?.length} employees
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <Icon name="ChevronLeft" size={16} className="mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={formData?.selectedEmployees?.length === 0}
                    >
                      Next: Review
                      <Icon name="ChevronRight" size={16} className="ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2.5: Add Employee */}
              {step === 2.5 && (
                <div className="space-y-6">
                  <h4 className="text-lg font-medium text-gray-900">Add New Employee</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Employee Name *"
                      value={newEmployee?.name}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, name: e?.target?.value }))}
                      placeholder="Enter full name"
                    />
                    
                    <Input
                      label="Email Address *"
                      type="email"
                      value={newEmployee?.email}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, email: e?.target?.value }))}
                      placeholder="Enter email address"
                    />

                    <Input
                      label="Department"
                      value={newEmployee?.department}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, department: e?.target?.value }))}
                      placeholder="Enter department"
                    />
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddEmployee} disabled={loading}>
                      {loading ? 'Adding...' : 'Add Employee'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Review and Confirm */}
              {step === 3 && (
                <div className="space-y-6">
                  <h4 className="text-lg font-medium text-gray-900">Review Booking</h4>
                  
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-gray-700">Booking Name</h5>
                        <p className="text-gray-900">{formData?.bookingName}</p>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-gray-700">Vehicle</h5>
                        <p className="text-gray-900">
                          {vehicles?.find(v => v?.id === formData?.vehicleId)?.name}
                        </p>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-700">Route</h5>
                        <p className="text-gray-900">
                          {formData?.pickupLocation} → {formData?.dropoffLocation}
                        </p>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-gray-700">Date & Time</h5>
                        <p className="text-gray-900">
                          {new Date(`${formData.pickupDate}T${formData.pickupTime || '09:00'}`)?.toLocaleDateString()} at{' '}
                          {formData?.pickupTime || '09:00'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">
                        Selected Employees ({formData?.selectedEmployees?.length})
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {formData?.selectedEmployees?.map(empId => {
                          const employee = employees?.find(e => e?.id === empId);
                          return (
                            <div key={empId} className="text-sm text-gray-600">
                              {employee?.name}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {formData?.notes && (
                      <div>
                        <h5 className="font-medium text-gray-700">Notes</h5>
                        <p className="text-gray-900">{formData?.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <Icon name="ChevronLeft" size={16} className="mr-2" />
                      Back
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                      {loading ? 'Creating...' : 'Create Bulk Booking'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <InvoiceReceiptModal
        isOpen={showInvoice}
        onClose={() => { setShowInvoice(false); onClose(); }}
        booking={confirmedBooking}
        userProfile={userProfile}
      />
    </>
  );
};

export default BulkBookingModal;