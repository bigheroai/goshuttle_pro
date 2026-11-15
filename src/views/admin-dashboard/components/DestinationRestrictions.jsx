import React, { useState, useEffect } from 'react';
import { MapPin, Save, RefreshCw, ToggleLeft, ToggleRight, Clock } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import destinationSettingsService from '../../../services/destinationSettingsService';

const ALL_DESTINATIONS = [
  'Quezon City', 'Makati', 'Tagaytay', 'Calamba', 'Sto. Tomas Batangas',
  'Alabang', 'Cavite', 'Manila', 'Pasig', 'Taguig', 'Mandaluyong',
  'Pasay', 'Parañaque', 'Las Piñas', 'Muntinlupa', 'Marikina',
  'Valenzuela', 'Malabon', 'Navotas', 'San Juan', 'Batangas City',
  'Lipa', 'Lucena', 'Antipolo', 'San Pedro', 'Biñan', 'Santa Rosa'
];

const DestinationRestrictions = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRate, setSavingRate] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rateSuccess, setRateSuccess] = useState('');
  const [rateError, setRateError] = useState('');

  // Destination restrictions state
  const [restrictionsEnabled, setRestrictionsEnabled] = useState(false);
  const [allowedDestinations, setAllowedDestinations] = useState([...ALL_DESTINATIONS]);

  // Global excess hourly rate state
  const [globalRate, setGlobalRate] = useState({ rate: 300, base_hours: 10, notes: '' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const [restrictions, rateConfig] = await Promise.all([
        destinationSettingsService?.getDestinationRestrictions(),
        destinationSettingsService?.getGlobalExcessHourlyRate()
      ]);

      setRestrictionsEnabled(restrictions?.enabled || false);
      setAllowedDestinations(
        restrictions?.allowed_destinations?.length > 0
          ? restrictions?.allowed_destinations
          : [...ALL_DESTINATIONS]
      );
      setGlobalRate({
        rate: rateConfig?.rate || 300,
        base_hours: rateConfig?.base_hours || 10,
        notes: rateConfig?.notes || ''
      });
    } catch (err) {
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDestination = (destination) => {
    setAllowedDestinations(prev => {
      if (prev?.includes(destination)) {
        return prev?.filter(d => d !== destination);
      } else {
        return [...prev, destination];
      }
    });
  };

  const handleSelectAll = () => {
    setAllowedDestinations([...ALL_DESTINATIONS]);
  };

  const handleDeselectAll = () => {
    setAllowedDestinations([]);
  };

  const handleSaveRestrictions = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await destinationSettingsService?.saveDestinationRestrictions({
        enabled: restrictionsEnabled,
        allowed_destinations: allowedDestinations,
        restricted_destinations: ALL_DESTINATIONS?.filter(d => !allowedDestinations?.includes(d))
      });
      setSuccess('Destination restrictions saved successfully.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError('Failed to save destination restrictions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGlobalRate = async () => {
    if (!globalRate?.rate || isNaN(parseFloat(globalRate?.rate))) {
      setRateError('Please enter a valid excess hourly rate.');
      return;
    }
    setSavingRate(true);
    setRateError('');
    setRateSuccess('');
    try {
      await destinationSettingsService?.saveGlobalExcessHourlyRate({
        rate: parseFloat(globalRate?.rate),
        base_hours: parseInt(globalRate?.base_hours) || 10,
        notes: globalRate?.notes || ''
      });
      setRateSuccess('Global excess hourly rate saved successfully.');
      setTimeout(() => setRateSuccess(''), 4000);
    } catch (err) {
      setRateError('Failed to save global rate. Please try again.');
    } finally {
      setSavingRate(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <RefreshCw size={24} className="animate-spin text-primary mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Global Excess Hourly Rate */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
            <Clock size={18} className="text-orange-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Global Excess Hourly Rate</h3>
            <p className="text-sm text-gray-500">Default rate charged per hour beyond the base hours when no specific rate sheet is matched</p>
          </div>
        </div>

        {rateError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{rateError}</div>
        )}
        {rateSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">{rateSuccess}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <Input
            label="Base Hours (included in base rate)"
            type="number"
            min="1"
            max="24"
            value={globalRate?.base_hours}
            onChange={(e) => setGlobalRate(prev => ({ ...prev, base_hours: e?.target?.value }))}
          />
          <Input
            label="Excess Hourly Rate (₱/hr)"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 300"
            value={globalRate?.rate}
            onChange={(e) => setGlobalRate(prev => ({ ...prev, rate: e?.target?.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="e.g. Applies when no rate sheet matched"
              value={globalRate?.notes}
              onChange={(e) => setGlobalRate(prev => ({ ...prev, notes: e?.target?.value }))}
            />
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-orange-800">
            <span className="font-semibold">Preview: </span>
            Base {globalRate?.base_hours || 10} hours included. Each additional hour costs{' '}
            <span className="font-semibold">₱{parseFloat(globalRate?.rate || 0)?.toLocaleString()}</span>.
            A {parseInt(globalRate?.base_hours || 10) + 2}-hour trip adds{' '}
            <span className="font-semibold">₱{(2 * parseFloat(globalRate?.rate || 0))?.toLocaleString()}</span> in excess charges.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSaveGlobalRate} disabled={savingRate}>
            <Save size={16} className="mr-2" />
            {savingRate ? 'Saving...' : 'Save Rate'}
          </Button>
        </div>
      </div>

      {/* Section 2: Destination Restrictions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <MapPin size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Destination Restrictions</h3>
              <p className="text-sm text-gray-500">Control which destinations appear in search results for customers</p>
            </div>
          </div>
          <button
            onClick={() => setRestrictionsEnabled(prev => !prev)}
            className="flex items-center gap-2 text-sm font-medium"
            title={restrictionsEnabled ? 'Disable restrictions' : 'Enable restrictions'}
          >
            {restrictionsEnabled ? (
              <>
                <ToggleRight size={28} className="text-primary" />
                <span className="text-primary">Restrictions ON</span>
              </>
            ) : (
              <>
                <ToggleLeft size={28} className="text-gray-400" />
                <span className="text-gray-500">Restrictions OFF</span>
              </>
            )}
          </button>
        </div>

        {!restrictionsEnabled && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Restrictions are disabled.</span> All destinations are visible to customers. Enable restrictions to control which destinations appear in search results.
            </p>
          </div>
        )}

        {restrictionsEnabled && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Restrictions are active.</span> Only checked destinations will appear in customer search results.{' '}
              <span className="font-semibold">{allowedDestinations?.length} of {ALL_DESTINATIONS?.length}</span> destinations are currently enabled.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">{success}</div>
        )}

        {/* Destination Checkboxes */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">
              Destinations ({allowedDestinations?.length} enabled)
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="text-xs text-primary hover:underline font-medium"
              >
                Enable All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={handleDeselectAll}
                className="text-xs text-red-500 hover:underline font-medium"
              >
                Disable All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {ALL_DESTINATIONS?.map((destination) => {
              const isAllowed = allowedDestinations?.includes(destination);
              return (
                <label
                  key={destination}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    isAllowed
                      ? 'border-primary bg-blue-50 text-primary' :'border-gray-200 bg-white text-gray-500'
                  } ${!restrictionsEnabled ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isAllowed}
                    onChange={() => handleToggleDestination(destination)}
                    disabled={!restrictionsEnabled}
                    className="w-3.5 h-3.5 text-primary rounded border-gray-300 flex-shrink-0"
                  />
                  <span className="text-xs font-medium truncate">{destination}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSaveRestrictions} disabled={saving}>
            <Save size={16} className="mr-2" />
            {saving ? 'Saving...' : 'Save Restrictions'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DestinationRestrictions;
