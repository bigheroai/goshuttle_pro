import React, { useState, useEffect } from 'react';
import { Car, Users, MapPin, Settings, Plus, Building2, AlertTriangle, Trash2 } from 'lucide-react';
import { partnerFleetService } from '../../../services/partnerFleetService';
import { supabase } from '../../../lib/supabase';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function VehicleAssignment({ partnerId }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [assignmentForm, setAssignmentForm] = useState({
    selectedDriver: '',
    selectedVehicle: ''
  });
  const [addVehicleForm, setAddVehicleForm] = useState({
    name: '',
    vehicleType: 'van',
    licensePlate: '',
    capacity: '',
    dailyRate: '',
    imageUrl: '',
    description: '',
    features: ''
  });

  useEffect(() => {
    if (partnerId) {
      loadVehicles();
      loadAvailableVehicles();
      loadAvailableDrivers();
    }
  }, [partnerId]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const data = await partnerFleetService?.getPartnerVehicles(partnerId);
      setVehicles(data);
    } catch (err) {
      setError(err?.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableVehicles = async () => {
    try {
      // Get vehicles that are not assigned to any partner yet
      const { data, error } = await supabase
        ?.from('vehicles')
        ?.select(`
          *,
          partner_vehicles!left(id, is_active)
        `)
        ?.eq('status', 'active')
        ?.is('partner_vehicles.id', null);

      if (!error && data) {
        setAvailableVehicles(data);
      }
    } catch (err) {
      console.error('Error loading available vehicles:', err);
    }
  };

  const loadAvailableDrivers = async () => {
    try {
      // Get drivers for this partner
      const { data, error } = await supabase
        ?.from('driver_profiles')
        ?.select(`
          *,
          user_profiles!inner(full_name, email, phone)
        `)
        ?.eq('partner_id', partnerId)
        ?.is('vehicle_id', null); // Drivers not assigned to vehicles

      if (!error && data) {
        setAvailableDrivers(data);
      }
    } catch (err) {
      console.error('Error loading available drivers:', err);
    }
  };

  const handleAssignDriver = async () => {
    if (!assignmentForm?.selectedDriver || !selectedVehicle?.vehicleId) {
      setError('Please select a driver');
      return;
    }

    try {
      await partnerFleetService?.assignDriverToVehicle(partnerId, selectedVehicle?.vehicleId, assignmentForm?.selectedDriver);
      await loadVehicles();
      await loadAvailableDrivers();
      setShowAssignModal(false);
      setSelectedVehicle(null);
      setAssignmentForm({ selectedDriver: '', selectedVehicle: '' });
    } catch (err) {
      setError(err?.message);
    }
  };

  // FIXED: Enhanced vehicle assignment with proper handling
  const handleAssignVehicle = async () => {
    if (!assignmentForm?.selectedVehicle) {
      setError('Please select a vehicle to assign');
      return;
    }

    try {
      const { error } = await supabase
        ?.from('partner_vehicles')
        ?.insert([{
          partner_id: partnerId,
          vehicle_id: assignmentForm?.selectedVehicle,
          is_active: true,
          assignment_date: new Date()?.toISOString()
        }]);

      if (error) throw error;

      await loadVehicles();
      await loadAvailableVehicles();
      setShowAddModal(false);
      setAssignmentForm({ selectedDriver: '', selectedVehicle: '' });
      setError('');
    } catch (err) {
      setError(err?.message || 'Error assigning vehicle');
    }
  };

  // FIXED: Enhanced new vehicle creation
  const handleCreateVehicle = async (e) => {
    e?.preventDefault();

    if (!addVehicleForm?.name || !addVehicleForm?.licensePlate || !addVehicleForm?.capacity) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      // First create the vehicle
      const vehicleData = {
        name: addVehicleForm?.name?.trim(),
        vehicle_type: addVehicleForm?.vehicleType,
        license_plate: addVehicleForm?.licensePlate?.trim(),
        capacity: parseInt(addVehicleForm?.capacity),
        daily_rate: parseFloat(addVehicleForm?.dailyRate) || 0,
        image_url: addVehicleForm?.imageUrl?.trim() || null,
        description: addVehicleForm?.description?.trim(),
        features: addVehicleForm?.features ? 
                  addVehicleForm?.features?.split(',')?.map(f => f?.trim())?.filter(f => f) : [],
        status: 'active'
      };

      const { data: newVehicle, error: vehicleError } = await supabase
        ?.from('vehicles')
        ?.insert([vehicleData])
        ?.select('*')
        ?.single();

      if (vehicleError) throw vehicleError;

      // Then assign to partner
      const { error: assignError } = await supabase
        ?.from('partner_vehicles')
        ?.insert([{
          partner_id: partnerId,
          vehicle_id: newVehicle?.id,
          is_active: true,
          assignment_date: new Date()?.toISOString()
        }]);

      if (assignError) throw assignError;

      await loadVehicles();
      setShowAddModal(false);
      setAddVehicleForm({
        name: '',
        vehicleType: 'van',
        licensePlate: '',
        capacity: '',
        dailyRate: '',
        imageUrl: '',
        description: '',
        features: ''
      });
      setError('');
    } catch (err) {
      setError(err?.message || 'Error creating vehicle');
    }
  };

  const handleRemoveVehicle = async (vehicleId) => {
    if (!confirm('Are you sure you want to remove this vehicle from your fleet?')) return;

    try {
      const { error } = await supabase
        ?.from('partner_vehicles')
        ?.update({ is_active: false })
        ?.eq('vehicle_id', vehicleId)
        ?.eq('partner_id', partnerId);

      if (error) throw error;

      await loadVehicles();
      await loadAvailableVehicles();
    } catch (err) {
      setError(err?.message || 'Error removing vehicle');
    }
  };

  const getVehicleTypeIcon = (type) => {
    return <Car className="h-5 w-5" />;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      maintenance: { color: 'bg-yellow-100 text-yellow-800', label: 'Maintenance' },
      inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inactive' }
    };

    const config = statusConfig?.[status] || statusConfig?.inactive;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config?.color}`}>
        {config?.label}
      </span>
    );
  };

  const vehicleTypes = [
    { value: 'van', label: 'Van' },
    { value: 'shuttle', label: 'Shuttle' },
    { value: 'executive_car', label: 'Executive Car' },
    { value: 'corporate_car', label: 'Corporate Car' }
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3]?.map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Car className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Vehicle Assignment</h2>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setShowAddModal(true);
              setSelectedVehicle(null);
              setError('');
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Assign Vehicle
          </Button>
          <Button
            onClick={() => {
              setShowAddModal(true);
              setSelectedVehicle({ isNew: true });
              setError('');
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Vehicle
          </Button>
        </div>
      </div>

      {vehicles?.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Car className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No vehicles assigned</h3>
          <p className="mt-1 text-sm text-gray-500">
            Start by assigning existing vehicles or adding new ones to your fleet.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Assign Existing Vehicle
            </Button>
            <Button
              onClick={() => {
                setShowAddModal(true);
                setSelectedVehicle({ isNew: true });
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Vehicle
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles?.map((vehicle) => (
            <div key={vehicle?.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Vehicle Image */}
              <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                {vehicle?.vehicle?.imageUrl || vehicle?.vehicle?.image_url ? (
                  <img
                    src={vehicle?.vehicle?.imageUrl || vehicle?.vehicle?.image_url}
                    alt={vehicle?.vehicle?.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                    <Car className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Vehicle Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">
                    {vehicle?.vehicle?.name || 'Unnamed Vehicle'}
                  </h3>
                  {getStatusBadge(vehicle?.vehicle?.status)}
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    {getVehicleTypeIcon(vehicle?.vehicle?.vehicleType || vehicle?.vehicle?.vehicle_type)}
                    <span className="ml-2 capitalize">
                      {(vehicle?.vehicle?.vehicleType || vehicle?.vehicle?.vehicle_type || 'Unknown')?.replace('_', ' ')} • {vehicle?.vehicle?.capacity} seats
                    </span>
                  </div>

                  <div className="flex items-center">
                    <MapPin className="h-4 w-4" />
                    <span className="ml-2">{vehicle?.vehicle?.licensePlate || vehicle?.vehicle?.license_plate}</span>
                  </div>

                  {vehicle?.driver || vehicle?.assigned_driver ? (
                    <div className="flex items-center">
                      <Users className="h-4 w-4" />
                      <span className="ml-2">
                        Assigned to: {vehicle?.driver?.fullName || vehicle?.assigned_driver?.full_name || 'Driver'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center text-amber-600">
                      <Users className="h-4 w-4" />
                      <span className="ml-2">No driver assigned</span>
                    </div>
                  )}

                  <div className="text-xs text-gray-400">
                    Added: {new Date(vehicle?.assignmentDate || vehicle?.assignment_date)?.toLocaleDateString()}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() => {
                      setSelectedVehicle(vehicle);
                      setShowAssignModal(true);
                    }}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Users className="h-3 w-3 mr-1" />
                    {vehicle?.driver || vehicle?.assigned_driver ? 'Reassign' : 'Assign Driver'}
                  </Button>
                  <Button
                    onClick={() => handleRemoveVehicle(vehicle?.vehicle?.id || vehicle?.vehicleId)}
                    className="px-3 py-2 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={() => setSelectedVehicle(vehicle)}
                    className="px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Driver Assignment Modal - FIXED: Enhanced modal */}
      {showAssignModal && selectedVehicle && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Assign Driver to Vehicle
                </h3>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedVehicle(null);
                    setAssignmentForm({ selectedDriver: '', selectedVehicle: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Vehicle Details</h4>
                  <div className="text-sm text-gray-600">
                    <p><strong>Name:</strong> {selectedVehicle?.vehicle?.name}</p>
                    <p><strong>License Plate:</strong> {selectedVehicle?.vehicle?.licensePlate || selectedVehicle?.vehicle?.license_plate}</p>
                    <p><strong>Type:</strong> {selectedVehicle?.vehicle?.vehicleType || selectedVehicle?.vehicle?.vehicle_type}</p>
                    <p><strong>Capacity:</strong> {selectedVehicle?.vehicle?.capacity} passengers</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Driver
                  </label>
                  <Select
                    value={assignmentForm?.selectedDriver}
                    onChange={(value) => setAssignmentForm(prev => ({ ...prev, selectedDriver: value }))}
                    options={[
                      { value: '', label: 'Choose a driver...' },
                      ...availableDrivers?.map(driver => ({
                        value: driver?.id,
                        label: `${driver?.user_profiles?.full_name} (${driver?.user_profiles?.email})`
                      }))
                    ]}
                    placeholder="Choose a driver..."
                  />
                  {availableDrivers?.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      No available drivers found. Make sure drivers are registered for your fleet.
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={handleAssignDriver}
                    disabled={!assignmentForm?.selectedDriver}
                    className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Assign Driver
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedVehicle(null);
                      setAssignmentForm({ selectedDriver: '', selectedVehicle: '' });
                    }}
                    className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Assign Vehicle Modal - FIXED: Enhanced modal with proper form handling */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedVehicle?.isNew ? 'Add New Vehicle' : 'Assign Existing Vehicle'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedVehicle(null);
                    setAssignmentForm({ selectedDriver: '', selectedVehicle: '' });
                    setAddVehicleForm({
                      name: '',
                      vehicleType: 'van',
                      licensePlate: '',
                      capacity: '',
                      dailyRate: '',
                      imageUrl: '',
                      description: '',
                      features: ''
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                {selectedVehicle?.isNew ? (
                  /* Add New Vehicle Form */
                  <form onSubmit={handleCreateVehicle} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Vehicle Name *
                        </label>
                        <Input
                          value={addVehicleForm?.name}
                          onChange={(e) => setAddVehicleForm(prev => ({ ...prev, name: e?.target?.value }))}
                          placeholder="e.g., Partner Van 01"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          License Plate *
                        </label>
                        <Input
                          value={addVehicleForm?.licensePlate}
                          onChange={(e) => setAddVehicleForm(prev => ({ ...prev, licensePlate: e?.target?.value }))}
                          placeholder="e.g., ABC-123"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Vehicle Type
                        </label>
                        <Select
                          value={addVehicleForm?.vehicleType}
                          onChange={(value) => setAddVehicleForm(prev => ({ ...prev, vehicleType: value }))}
                          options={vehicleTypes}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Capacity (passengers) *
                        </label>
                        <Input
                          type="number"
                          value={addVehicleForm?.capacity}
                          onChange={(e) => setAddVehicleForm(prev => ({ ...prev, capacity: e?.target?.value }))}
                          placeholder="8"
                          min="1"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Daily Rate (₱)
                        </label>
                        <Input
                          type="number"
                          value={addVehicleForm?.dailyRate}
                          onChange={(e) => setAddVehicleForm(prev => ({ ...prev, dailyRate: e?.target?.value }))}
                          placeholder="2500"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Image URL
                        </label>
                        <Input
                          type="url"
                          value={addVehicleForm?.imageUrl}
                          onChange={(e) => setAddVehicleForm(prev => ({ ...prev, imageUrl: e?.target?.value }))}
                          placeholder="https://example.com/vehicle.jpg"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={addVehicleForm?.description}
                          onChange={(e) => setAddVehicleForm(prev => ({ ...prev, description: e?.target?.value }))}
                          placeholder="Describe the vehicle..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows="3"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Features (comma-separated)
                        </label>
                        <Input
                          value={addVehicleForm?.features}
                          onChange={(e) => setAddVehicleForm(prev => ({ ...prev, features: e?.target?.value }))}
                          placeholder="Air Conditioning, Wi-Fi, USB Charging"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        type="submit"
                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        Create & Assign Vehicle
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  /* Assign Existing Vehicle */
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Vehicle to Assign
                      </label>
                      <Select
                        value={assignmentForm?.selectedVehicle}
                        onChange={(value) => setAssignmentForm(prev => ({ ...prev, selectedVehicle: value }))}
                        options={[
                          { value: '', label: 'Choose a vehicle...' },
                          ...availableVehicles?.map(vehicle => ({
                            value: vehicle?.id,
                            label: `${vehicle?.name} (${vehicle?.license_plate}) - ${vehicle?.capacity} seats`
                          }))
                        ]}
                        placeholder="Choose a vehicle..."
                      />
                      {availableVehicles?.length === 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          No unassigned vehicles available. All vehicles are currently assigned to other partners.
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        onClick={handleAssignVehicle}
                        disabled={!assignmentForm?.selectedVehicle}
                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Assign Vehicle
                      </Button>
                      <Button
                        onClick={() => setShowAddModal(false)}
                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}