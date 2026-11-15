import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Plus, Edit, Trash2, Users, Car, DollarSign, AlertTriangle, Shield } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import ImageUpload from '../../../components/ImageUpload';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import vehicleService from '../../../utils/vehicleService';

const FleetManagement = ({ vehicles, onUpdate }) => {
  const { user, userProfile, isAdmin } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    vehicleType: 'van',
    licensePlate: '',
    capacity: '',
    imageUrl: '',
    description: '',
    features: '',
    dailyRate: '',
    status: 'active',
    assignedCompany: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [vehicleAssignments, setVehicleAssignments] = useState([]);

  // Redirect non-admin users
  useEffect(() => {
    if (userProfile && !isAdmin) {
      setError('Access denied. Only administrators can manage the vehicle fleet.');
    }
  }, [userProfile, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadCompanies();
      loadVehicleAssignments();
    }
  }, [isAdmin]);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase?.from('companies')?.select('*');
      if (data && !error) setCompanies(data);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const loadVehicleAssignments = async () => {
    try {
      const { data, error } = await supabase
        ?.from('corporate_vehicle_assignments')
        ?.select('*, companies(name)')
        ?.eq('is_active', true);
      if (data && !error) setVehicleAssignments(data);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const vehicleTypes = [
    { value: 'van', label: 'Van' },
    { value: 'shuttle', label: 'Shuttle' },
    { value: 'executive_car', label: 'Executive Car' },
    { value: 'corporate_car', label: 'Corporate Car' }
  ];

  // Default capacities per vehicle type
  const vehicleTypeCapacities = {
    van: 10,
    shuttle: 20,
    executive_car: 4,
    corporate_car: 6
  };

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'inactive', label: 'Inactive' }
  ];

  const resetForm = () => {
    setFormData({
      name: '',
      vehicleType: 'van',
      licensePlate: '',
      capacity: '',
      imageUrl: '',
      description: '',
      features: '',
      dailyRate: '',
      status: 'active',
      assignedCompany: ''
    });
    setEditingVehicle(null);
    setError('');
  };

  const handleEdit = (vehicle) => {
    if (!isAdmin) {
      setError('Access denied. Only administrators can edit vehicles.');
      return;
    }

    const assignment = vehicleAssignments?.find(a => a?.vehicle_id === vehicle?.id);
    
    // FIXED: Enhanced form data population with proper field mapping
    setFormData({
      name: vehicle?.name || '',
      vehicleType: vehicle?.vehicleType || vehicle?.vehicle_type || 'van', // Handle both camelCase and snake_case
      licensePlate: vehicle?.licensePlate || vehicle?.license_plate || '',
      capacity: vehicle?.capacity?.toString() || '',
      imageUrl: vehicle?.imageUrl || vehicle?.image_url || '',
      description: vehicle?.description || '',
      features: Array.isArray(vehicle?.features) ? vehicle?.features?.join(', ') : 
                (typeof vehicle?.features === 'string' ? vehicle?.features : ''),
      dailyRate: (vehicle?.dailyRate || vehicle?.daily_rate)?.toString() || '',
      status: vehicle?.status || 'active',
      assignedCompany: assignment?.company_id || ''
    });
    setEditingVehicle(vehicle);
    setShowAddModal(true);
  };

  const handleVehicleImageUpload = async (vehicleId, imageData) => {
    if (!isAdmin) {
      setError('Access denied. Only administrators can upload vehicle images.');
      return;
    }

    // Reload vehicles to refresh the image URLs
    onUpdate?.();
    setError('');
  };

  const handleVehicleImageError = (error) => {
    setError(`Image upload failed: ${error}`);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!isAdmin) {
      setError('Access denied. Only administrators can manage vehicles.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // FIXED: Proper data validation and formatting
      const vehicleData = {
        name: formData?.name?.trim(),
        vehicleType: formData?.vehicleType,
        licensePlate: formData?.licensePlate?.trim(),
        capacity: parseInt(formData?.capacity),
        imageUrl: formData?.imageUrl?.trim() || null,
        description: formData?.description?.trim(),
        features: formData?.features ? 
                  formData?.features?.split(',')?.map(f => f?.trim())?.filter(f => f) : [],
        dailyRate: parseFloat(formData?.dailyRate) || 0,
        status: formData?.status
      };

      // Validate required fields
      if (!vehicleData?.name || !vehicleData?.licensePlate || !vehicleData?.capacity || vehicleData?.capacity < 1) {
        throw new Error('Please fill in all required fields with valid values.');
      }

      let vehicleResult;
      if (editingVehicle) {
        vehicleResult = await vehicleService?.update(editingVehicle?.id, vehicleData);
      } else {
        vehicleResult = await vehicleService?.create(vehicleData);
      }

      // Handle company assignment if specified
      if (formData?.assignedCompany && vehicleResult) {
        const vehicleId = editingVehicle?.id || vehicleResult?.id;
        
        // First, deactivate existing assignments for this vehicle
        await supabase
          ?.from('corporate_vehicle_assignments')
          ?.update({ is_active: false })
          ?.eq('vehicle_id', vehicleId);
          
        // Then create new assignment
        const { error: assignmentError } = await supabase
          ?.from('corporate_vehicle_assignments')
          ?.insert([{
            company_id: formData?.assignedCompany,
            vehicle_id: vehicleId,
            assigned_by: user?.id,
            notes: `Vehicle assigned during fleet management`
          }]);
          
        if (assignmentError) {
          console.error('Assignment error:', assignmentError);
        }
      }

      setShowAddModal(false);
      resetForm();
      onUpdate?.();
      loadVehicleAssignments();
    } catch (error) {
      setError(error?.message || 'An unexpected error occurred');
      console.error('Vehicle operation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vehicleId) => {
    if (!isAdmin) {
      setError('Access denied. Only administrators can delete vehicles.');
      return;
    }

    if (!confirm('Are you sure you want to delete this vehicle? If it has existing bookings, it will be deactivated instead of permanently deleted.')) return;

    try {
      const result = await vehicleService?.delete(vehicleId);
      // Immediately trigger parent refresh to reflect the change
      onUpdate?.();
      if (result?.softDeleted) {
        setError('This vehicle has existing bookings and cannot be permanently deleted. It has been marked as Inactive instead.');
      } else {
        setError('');
      }
    } catch (error) {
      setError(error?.message || 'An unexpected error occurred');
      console.error('Delete vehicle error:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      maintenance: { color: 'bg-yellow-100 text-yellow-800', label: 'Maintenance' },
      inactive: { color: 'bg-red-100 text-red-800', label: 'Inactive' }
    };
    const config = statusConfig?.[status] || statusConfig?.inactive;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config?.color}`}>
        {config?.label}
      </span>
    );
  };

  const getAssignedCompany = (vehicleId) => {
    const assignment = vehicleAssignments?.find(a => a?.vehicle_id === vehicleId);
    return assignment?.companies?.name;
  };

  // ENHANCED: Get vehicle owner type and details
  const getVehicleOwnerInfo = (vehicleId) => {
    // All vehicles are GoShuttle managed
    return {
      type: 'admin',
      name: 'GoShuttle',
      icon: <Shield className="w-3 h-3" />,
      badge: 'bg-green-100 text-green-800'
    };
  };

  const handleVehicleTypeChange = (value) => {
    const defaultCapacity = vehicleTypeCapacities?.[value] || '';
    setFormData(prev => ({
      ...prev,
      vehicleType: value,
      capacity: defaultCapacity?.toString()
    }));
  };

  // Show access denied message for non-admin users
  if (!isAdmin && userProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <AlertTriangle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-600 mb-4">
          Only administrators can manage the vehicle fleet. Companies and regular users can only book rides.
        </p>
        <p className="text-sm text-gray-500">
          Contact your administrator if you need to add or modify vehicles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Fleet Management</h2>
          <p className="text-sm sm:text-base text-gray-600">
            View all vehicles across GoShuttle fleet
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 w-full sm:w-auto justify-center"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            Add Vehicle
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* ENHANCED: Vehicle Grid with Owner Information */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {vehicles?.map((vehicle) => {
          const ownerInfo = getVehicleOwnerInfo(vehicle?.id);
          
          return (
            <div key={vehicle?.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Vehicle Image with Upload Overlay (Admin Only) */}
              <div className="relative h-40 sm:h-48 bg-gray-100">
                {vehicle?.imageUrl || vehicle?.image_url ? (
                  <img
                    src={vehicle?.imageUrl || vehicle?.image_url}
                    alt={vehicle?.name || 'Vehicle image'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
                  </div>
                )}
                
                {/* Image Upload Overlay - Admin Only */}
                {isAdmin && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImageUpload
                      bucketName="vehicles"
                      userId={user?.id}
                      folder={`vehicles/${vehicle?.id}`}
                      currentImageUrl={vehicle?.imageUrl || vehicle?.image_url}
                      onUploadSuccess={(imageData) => handleVehicleImageUpload(vehicle?.id, imageData)}
                      onUploadError={handleVehicleImageError}
                      maxSizeText="10MB"
                    >
                      <Button variant="outline" size="sm" className="text-white border-white hover:bg-white hover:text-gray-900 text-xs">
                        <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        Upload
                      </Button>
                    </ImageUpload>
                  </div>
                )}
              </div>

              <div className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-lg font-medium text-gray-900 truncate">{vehicle?.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-500">{vehicle?.licensePlate || vehicle?.license_plate}</p>
                    
                    {/* ENHANCED: Owner Badge */}
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${ownerInfo?.badge}`}>
                        {ownerInfo?.icon}
                        <span className="ml-1">{ownerInfo?.name}</span>
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(vehicle?.status)}
                </div>
                
                <div className="mt-3 space-y-1 sm:space-y-2">
                  <div className="flex items-center text-xs sm:text-sm text-gray-600">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Capacity: {vehicle?.capacity} passengers</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-600">
                    <Car className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Type: {(vehicle?.vehicleType || vehicle?.vehicle_type)?.replace('_', ' ')?.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-600">
                    <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">₱{(vehicle?.dailyRate || vehicle?.daily_rate)?.toLocaleString()} per day</span>
                  </div>
                </div>

                {/* Admin-only action buttons */}
                {isAdmin && (
                  <div className="mt-3 sm:mt-4 flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(vehicle)}
                      className="flex items-center gap-1 flex-1 justify-center text-xs"
                    >
                      <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(vehicle?.id)}
                      className="flex items-center gap-1 flex-1 justify-center text-xs text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {vehicles?.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <Car className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No vehicles in fleet</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            {isAdmin 
              ? "Start by adding your first vehicle to the fleet" : "Contact administrator to add vehicles to the fleet"
            }
          </p>
          {isAdmin && (
            <Button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="flex items-center gap-2"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              Add Vehicle
            </Button>
          )}
        </div>
      )}

      {/* Add/Edit Modal - Admin Only - FIXED: Enhanced dropdown handling */}
      {showAddModal && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </Button>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs sm:text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Vehicle Image Upload Section */}
              {editingVehicle && (
                <div className="mb-4 sm:mb-6 border-b border-gray-200 pb-4 sm:pb-6">
                  <h4 className="text-sm sm:text-md font-medium text-gray-900 mb-3 sm:mb-4">Vehicle Image</h4>
                  <ImageUpload
                    bucketName="vehicles"
                    userId={user?.id}
                    folder={`vehicles/${editingVehicle?.id}`}
                    currentImageUrl={editingVehicle?.imageUrl || editingVehicle?.image_url}
                    onUploadSuccess={(imageData) => handleVehicleImageUpload(editingVehicle?.id, imageData)}
                    onUploadError={handleVehicleImageError}
                    maxSizeText="10MB"
                  />
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Vehicle Name
                    </label>
                    <Input
                      value={formData?.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e?.target?.value }))}
                      placeholder="e.g., GoShuttle Van 01"
                      required
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      License Plate
                    </label>
                    <Input
                      value={formData?.licensePlate}
                      onChange={(e) => setFormData(prev => ({ ...prev, licensePlate: e?.target?.value }))}
                      placeholder="e.g., GSP-001"
                      required
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Vehicle Type
                    </label>
                    <Select
                      value={formData?.vehicleType}
                      onChange={handleVehicleTypeChange}
                      options={vehicleTypes}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Capacity (passengers)
                    </label>
                    <Input
                      type="number"
                      value={formData?.capacity}
                      onChange={(e) => {
                        const val = parseInt(e?.target?.value);
                        if (!isNaN(val) && val >= 1 && val <= 100) {
                          setFormData(prev => ({ ...prev, capacity: e?.target?.value }));
                        } else if (e?.target?.value === '') {
                          setFormData(prev => ({ ...prev, capacity: '' }));
                        }
                      }}
                      placeholder="8"
                      min="1"
                      max="100"
                      required
                      className="text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-filled based on vehicle type. Min: 1, Max: 100.</p>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Daily Rate (₱)
                    </label>
                    <Input
                      type="number"
                      value={formData?.dailyRate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dailyRate: e?.target?.value }))}
                      placeholder="2500"
                      min="0"
                      step="0.01"
                      required
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <Select
                      value={formData?.status}
                      onChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                      options={statusOptions}
                      className="text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Company
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                      <span className="font-medium text-amber-600">GoShuttle</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      All vehicles are assigned to GoShuttle
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Image URL (Optional)
                  </label>
                  <Input
                    type="url"
                    value={formData?.imageUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e?.target?.value }))}
                    placeholder="https://example.com/vehicle-image.jpg"
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You can also upload images directly using the image upload feature above
                  </p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData?.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e?.target?.value }))}
                    placeholder="Describe the vehicle features and amenities"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Features (comma-separated)
                  </label>
                  <Input
                    value={formData?.features}
                    onChange={(e) => setFormData(prev => ({ ...prev, features: e?.target?.value }))}
                    placeholder="Air Conditioning, Wi-Fi, USB Charging"
                    className="text-sm"
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 justify-center w-full sm:w-auto"
                    size="sm"
                  >
                    {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    {loading ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
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

export default FleetManagement;