import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import preferencesService from '../../../services/preferencesService';

const SavedPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('travel');

  // Load user preferences
  useEffect(() => {
    if (user?.id) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const userPreferences = await preferencesService?.getPreferences(user?.id);
      
      // Merge with defaults
      const defaultPreferences = preferencesService?.getDefaultPreferences();
      const mergedPreferences = { ...defaultPreferences };
      
      // Override with user preferences
      Object.keys(userPreferences)?.forEach(category => {
        if (mergedPreferences?.[category]) {
          mergedPreferences[category] = { ...mergedPreferences?.[category], ...userPreferences?.[category] };
        }
      });
      
      setPreferences(mergedPreferences);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (category, key, value) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev?.[category],
        [key]: value
      }
    }));
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      await preferencesService?.updatePreferences(user?.id, preferences);
      
      // Show success message
      alert('Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    { id: 'travel', label: 'Travel Preferences', icon: 'MapPin' },
    { id: 'communication', label: 'Communications', icon: 'Bell' },
    { id: 'accessibility', label: 'Accessibility', icon: 'Settings' },
    { id: 'routes', label: 'Route Settings', icon: 'Navigation' }
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <Icon name="Loader2" className="animate-spin mr-2" size={24} />
          <span>Loading preferences...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Saved Preferences</h3>
            <p className="text-sm text-gray-600">Customize your travel and communication preferences</p>
          </div>
          <Button onClick={savePreferences} disabled={saving}>
            {saving && <Icon name="Loader2" className="animate-spin mr-2" size={16} />}
            Save Changes
          </Button>
        </div>
      </div>
      <div className="flex">
        {/* Category Sidebar */}
        <div className="w-64 border-r border-gray-200 p-4">
          <nav className="space-y-1">
            {categories?.map((category) => (
              <button
                key={category?.id}
                onClick={() => setActiveCategory(category?.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeCategory === category?.id
                    ? 'bg-primary text-white' :'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon name={category?.icon} size={18} />
                {category?.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Preferences Content */}
        <div className="flex-1 p-6">
          {activeCategory === 'travel' && (
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-900">Travel Preferences</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Pickup Time
                  </label>
                  <select
                    value={preferences?.travel?.preferred_pickup_time || ''}
                    onChange={(e) => updatePreference('travel', 'preferred_pickup_time', e?.target?.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="morning">Morning (6AM - 12PM)</option>
                    <option value="afternoon">Afternoon (12PM - 6PM)</option>
                    <option value="evening">Evening (6PM - 10PM)</option>
                    <option value="late_night">Late Night (10PM - 6AM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Vehicle Type
                  </label>
                  <select
                    value={preferences?.travel?.preferred_vehicle_type || ''}
                    onChange={(e) => updatePreference('travel', 'preferred_vehicle_type', e?.target?.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="van">Van</option>
                    <option value="shuttle">Shuttle</option>
                    <option value="executive_car">Executive Car</option>
                    <option value="corporate_car">Corporate Car</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Advance Notification Time (minutes)
                  </label>
                  <select
                    value={preferences?.travel?.notification_advance_time || ''}
                    onChange={(e) => updatePreference('travel', 'notification_advance_time', parseInt(e?.target?.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences?.travel?.auto_book_return || false}
                      onChange={(e) => updatePreference('travel', 'auto_book_return', e?.target?.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="ml-2 text-sm text-gray-700">Auto-book return trips</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'communication' && (
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-900">Communication Preferences</h4>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">SMS Notifications</div>
                    <div className="text-sm text-gray-600">Receive trip updates via SMS</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences?.communication?.notification_sms || false}
                    onChange={(e) => updatePreference('communication', 'notification_sms', e?.target?.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Email Notifications</div>
                    <div className="text-sm text-gray-600">Receive booking confirmations via email</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences?.communication?.notification_email || false}
                    onChange={(e) => updatePreference('communication', 'notification_email', e?.target?.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Push Notifications</div>
                    <div className="text-sm text-gray-600">Receive real-time push notifications</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences?.communication?.notification_push || false}
                    onChange={(e) => updatePreference('communication', 'notification_push', e?.target?.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Driver Contact Allowed</div>
                    <div className="text-sm text-gray-600">Allow drivers to contact you directly</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences?.communication?.driver_contact_allowed || false}
                    onChange={(e) => updatePreference('communication', 'driver_contact_allowed', e?.target?.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Marketing Notifications</div>
                    <div className="text-sm text-gray-600">Receive promotional offers and updates</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences?.communication?.marketing_notifications || false}
                    onChange={(e) => updatePreference('communication', 'marketing_notifications', e?.target?.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </label>
              </div>
            </div>
          )}

          {activeCategory === 'accessibility' && (
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-900">Accessibility Preferences</h4>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Wheelchair Accessible Vehicles</div>
                    <div className="text-sm text-gray-600">Require wheelchair accessible vehicles</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences?.accessibility?.wheelchair_accessible || false}
                    onChange={(e) => updatePreference('accessibility', 'wheelchair_accessible', e?.target?.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Audio Assistance</div>
                    <div className="text-sm text-gray-600">Enable audio notifications and assistance</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences?.accessibility?.audio_assistance || false}
                    onChange={(e) => updatePreference('accessibility', 'audio_assistance', e?.target?.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Large Text</div>
                    <div className="text-sm text-gray-600">Use larger text throughout the app</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences?.accessibility?.large_text || false}
                    onChange={(e) => updatePreference('accessibility', 'large_text', e?.target?.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">High Contrast</div>
                    <div className="text-sm text-gray-600">Use high contrast colors</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences?.accessibility?.high_contrast || false}
                    onChange={(e) => updatePreference('accessibility', 'high_contrast', e?.target?.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </label>
              </div>
            </div>
          )}

          {activeCategory === 'routes' && (
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-900">Route Preferences</h4>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Avoid Toll Roads</div>
                    <div className="text-sm text-gray-600">Prefer routes that avoid toll roads</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences?.routes?.avoid_tolls || false}
                    onChange={(e) => updatePreference('routes', 'avoid_tolls', e?.target?.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Fastest Route</div>
                    <div className="text-sm text-gray-600">Prioritize fastest route over shortest distance</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences?.routes?.fastest_route || false}
                    onChange={(e) => updatePreference('routes', 'fastest_route', e?.target?.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Eco-Friendly Routes</div>
                    <div className="text-sm text-gray-600">Choose routes that minimize environmental impact</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences?.routes?.eco_friendly || false}
                    onChange={(e) => updatePreference('routes', 'eco_friendly', e?.target?.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedPreferences;