import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, DollarSign, RefreshCw, X, Save } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import rateSheetService from '../../../services/rateSheetService';

const VEHICLE_TYPES = [
  { value: 'van', label: 'Van' },
  { value: 'shuttle', label: 'Shuttle' },
  { value: 'executive_car', label: 'Executive Car' },
  { value: 'corporate_car', label: 'Corporate Car' }
];

const TRIP_CATEGORIES = [
  { value: 'airport_transfer', label: 'Airport Transfer' },
  { value: 'city_tour', label: 'City Tour' },
  { value: 'provincial', label: 'Provincial' },
  { value: 'corporate_daily', label: 'Corporate Daily' },
  { value: 'event_transfer', label: 'Event Transfer' },
  { value: 'multi_day', label: 'Multi-Day' }
];

const DESTINATION_ZONES = [
  { value: 'metro_manila', label: 'Metro Manila' },
  { value: 'luzon_nearby', label: 'Luzon Nearby (Tagaytay, Batangas, etc.)' },
  { value: 'luzon_far', label: 'Luzon Far (Baguio, Ilocos, etc.)' },
  { value: 'visayas', label: 'Visayas' },
  { value: 'mindanao', label: 'Mindanao' },
  { value: 'international', label: 'International' }
];

const emptyForm = {
  vehicleType: 'van',
  tripCategory: 'airport_transfer',
  destinationZone: 'metro_manila',
  baseRate: '',
  baseHours: '10',
  excessHourlyRate: '',
  multiDayRate: '',
  fuelSurcharge: '0',
  notes: '',
  isActive: true
};

const RateSheetManagement = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterZone, setFilterZone] = useState('all');

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await rateSheetService?.getAll();
      setRates(data || []);
    } catch (err) {
      setError('Failed to load rate sheets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData(emptyForm);
    setEditingRate(null);
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (rate) => {
    setFormData({
      vehicleType: rate?.vehicle_type || 'van',
      tripCategory: rate?.trip_category || 'airport_transfer',
      destinationZone: rate?.destination_zone || 'metro_manila',
      baseRate: rate?.base_rate?.toString() || '',
      baseHours: rate?.base_hours?.toString() || '10',
      excessHourlyRate: rate?.excess_hourly_rate?.toString() || '',
      multiDayRate: rate?.multi_day_rate?.toString() || '',
      fuelSurcharge: rate?.fuel_surcharge?.toString() || '0',
      notes: rate?.notes || '',
      isActive: rate?.is_active !== false
    });
    setEditingRate(rate);
    setError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRate(null);
    setFormData(emptyForm);
    setError('');
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData?.baseRate || isNaN(parseFloat(formData?.baseRate))) {
      setError('Base rate is required and must be a valid number.');
      return false;
    }
    if (!formData?.excessHourlyRate || isNaN(parseFloat(formData?.excessHourlyRate))) {
      setError('Excess hourly rate is required and must be a valid number.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setError('');
    try {
      if (editingRate) {
        await rateSheetService?.update(editingRate?.id, formData);
        setSuccess('Rate sheet updated successfully.');
      } else {
        await rateSheetService?.create(formData);
        setSuccess('Rate sheet created successfully.');
      }
      await loadRates();
      handleCloseModal();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.message?.includes('duplicate') || err?.message?.includes('unique')
        ? 'A rate already exists for this vehicle type, trip category, and destination zone combination.' :'Failed to save rate sheet. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this rate sheet entry?')) return;
    try {
      await rateSheetService?.delete(id);
      setRates(prev => prev?.filter(r => r?.id !== id));
      setSuccess('Rate sheet deleted.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete rate sheet.');
    }
  };

  const handleToggleActive = async (rate) => {
    try {
      await rateSheetService?.toggleActive(rate?.id, !rate?.is_active);
      setRates(prev => prev?.map(r => r?.id === rate?.id ? { ...r, is_active: !r?.is_active } : r));
    } catch (err) {
      setError('Failed to update rate status.');
    }
  };

  const getLabelByValue = (options, value) =>
    options?.find(o => o?.value === value)?.label || value;

  const filteredRates = rates?.filter(r => {
    const matchVehicle = filterVehicle === 'all' || r?.vehicle_type === filterVehicle;
    const matchZone = filterZone === 'all' || r?.destination_zone === filterZone;
    return matchVehicle && matchZone;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Rate Sheet Management</h2>
          <p className="text-sm text-gray-500">Manage pricing rates per vehicle type, trip category, and destination zone</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadRates} disabled={loading}>
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleOpenAdd}>
            <Plus size={16} className="mr-2" />
            Add Rate
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && !showModal && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">{success}</div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex-1 min-w-[160px]">
          <Select
            label="Filter by Vehicle"
            value={filterVehicle}
            onChange={(e) => setFilterVehicle(e?.target?.value)}
            options={[{ value: 'all', label: 'All Vehicles' }, ...VEHICLE_TYPES]}
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <Select
            label="Filter by Zone"
            value={filterZone}
            onChange={(e) => setFilterZone(e?.target?.value)}
            options={[{ value: 'all', label: 'All Zones' }, ...DESTINATION_ZONES]}
          />
        </div>
      </div>

      {/* Rate Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw size={24} className="animate-spin text-primary mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading rate sheets...</p>
          </div>
        ) : filteredRates?.length === 0 ? (
          <div className="p-8 text-center">
            <DollarSign size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No rate sheets found</p>
            <p className="text-gray-400 text-sm mt-1">Add your first rate to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Vehicle Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Trip Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Destination Zone</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Base Rate</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Base Hours</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Excess/hr</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Fuel Surcharge</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRates?.map((rate) => (
                  <tr key={rate?.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {getLabelByValue(VEHICLE_TYPES, rate?.vehicle_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {getLabelByValue(TRIP_CATEGORIES, rate?.trip_category)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {getLabelByValue(DESTINATION_ZONES, rate?.destination_zone)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      ₱{parseFloat(rate?.base_rate || 0)?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {rate?.base_hours || 10}h
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      ₱{parseFloat(rate?.excess_hourly_rate || 0)?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {parseFloat(rate?.fuel_surcharge || 0) > 0
                        ? `₱${parseFloat(rate?.fuel_surcharge)?.toLocaleString()}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(rate)}
                        className="flex items-center gap-1 mx-auto"
                        title={rate?.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {rate?.is_active ? (
                          <ToggleRight size={22} className="text-green-500" />
                        ) : (
                          <ToggleLeft size={22} className="text-gray-400" />
                        )}
                        <span className={`text-xs ${rate?.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                          {rate?.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(rate)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(rate?.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingRate ? 'Edit Rate Sheet' : 'Add New Rate Sheet'}
              </h3>
              <button onClick={handleCloseModal} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Vehicle Type *"
                  value={formData?.vehicleType}
                  onChange={(e) => handleChange('vehicleType', e?.target?.value)}
                  options={VEHICLE_TYPES}
                />
                <Select
                  label="Trip Category *"
                  value={formData?.tripCategory}
                  onChange={(e) => handleChange('tripCategory', e?.target?.value)}
                  options={TRIP_CATEGORIES}
                />
                <Select
                  label="Destination Zone *"
                  value={formData?.destinationZone}
                  onChange={(e) => handleChange('destinationZone', e?.target?.value)}
                  options={DESTINATION_ZONES}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Input
                  label="Base Rate (₱) *"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 3000"
                  value={formData?.baseRate}
                  onChange={(e) => handleChange('baseRate', e?.target?.value)}
                  required
                />
                <Input
                  label="Base Hours *"
                  type="number"
                  min="1"
                  max="24"
                  placeholder="10"
                  value={formData?.baseHours}
                  onChange={(e) => handleChange('baseHours', e?.target?.value)}
                  required
                />
                <Input
                  label="Excess Hourly Rate (₱) *"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 300"
                  value={formData?.excessHourlyRate}
                  onChange={(e) => handleChange('excessHourlyRate', e?.target?.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Multi-Day Rate (₱/day)"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Optional"
                  value={formData?.multiDayRate}
                  onChange={(e) => handleChange('multiDayRate', e?.target?.value)}
                />
                <Input
                  label="Fuel Surcharge (₱)"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={formData?.fuelSurcharge}
                  onChange={(e) => handleChange('fuelSurcharge', e?.target?.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  rows={2}
                  placeholder="Optional notes about this rate..."
                  value={formData?.notes}
                  onChange={(e) => handleChange('notes', e?.target?.value)}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData?.isActive}
                  onChange={(e) => handleChange('isActive', e?.target?.checked)}
                  className="w-4 h-4 text-primary rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">Active (visible during booking)</label>
              </div>

              {/* Preview */}
              {formData?.baseRate && formData?.excessHourlyRate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Rate Preview</p>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>Base: ₱{parseFloat(formData?.baseRate || 0)?.toLocaleString()} for {formData?.baseHours || 10} hours</p>
                    <p>Excess: ₱{parseFloat(formData?.excessHourlyRate || 0)?.toLocaleString()} per hour beyond {formData?.baseHours || 10}h</p>
                    {parseFloat(formData?.fuelSurcharge) > 0 && (
                      <p>Fuel surcharge: ₱{parseFloat(formData?.fuelSurcharge)?.toLocaleString()}</p>
                    )}
                    <p className="font-semibold pt-1 border-t border-blue-200 mt-2">
                      12-hour trip: ₱{(
                        parseFloat(formData?.baseRate || 0) +
                        (Math.max(0, 12 - parseInt(formData?.baseHours || 10)) * parseFloat(formData?.excessHourlyRate || 0)) +
                        parseFloat(formData?.fuelSurcharge || 0)
                      )?.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={handleCloseModal} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save size={16} className="mr-2" />
                  {saving ? 'Saving...' : editingRate ? 'Update Rate' : 'Create Rate'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RateSheetManagement;
