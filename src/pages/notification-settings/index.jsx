import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { preferencesService } from '../../services/preferencesService';

const Toggle = ({ checked, onChange, disabled = false }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
      checked ? 'bg-primary' : 'bg-gray-200'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const SectionCard = ({ icon, title, description, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon name={icon} size={18} className="text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
    </div>
    <div className="divide-y divide-gray-50">{children}</div>
  </div>
);

const SettingRow = ({ label, sublabel, children }) => (
  <div className="px-6 py-4 flex items-center justify-between gap-4">
    <div className="min-w-0">
      <p className="text-sm font-medium text-gray-800">{label}</p>
      {sublabel && <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

const FREQUENCY_OPTIONS = [
  { value: 'immediate', label: 'Immediately' },
  { value: 'hourly', label: 'Hourly digest' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly summary' },
];

const TIME_SLOTS = [
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '22:00', label: '10:00 PM' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_VALUES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const defaultSettings = {
  // Channel opt-ins
  email_enabled: true,
  sms_enabled: true,
  push_enabled: true,

  // Email notification types
  email_booking_confirmation: true,
  email_booking_reminder: true,
  email_booking_cancellation: true,
  email_driver_assigned: true,
  email_trip_completed: true,
  email_monthly_report: true,
  email_promotions: false,
  email_team_invitations: true,

  // SMS notification types
  sms_booking_confirmation: true,
  sms_booking_reminder: true,
  sms_driver_assigned: true,
  sms_trip_updates: true,
  sms_promotions: false,

  // Frequency
  email_frequency: 'immediate',
  sms_frequency: 'immediate',

  // Delivery time preferences
  quiet_hours_enabled: false,
  quiet_start: '22:00',
  quiet_end: '07:00',
  preferred_delivery_time: '08:00',
  active_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
};

const NotificationSettings = () => {
  const navigate = useNavigate();
  const { user, userProfile, loading, isAuthenticated } = useAuth();
  const [settings, setSettings] = useState(defaultSettings);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth/login');
    }
  }, [loading, isAuthenticated, navigate]);

  const loadSettings = useCallback(async () => {
    if (!user?.id) return;
    try {
      setPageLoading(true);
      const prefs = await preferencesService?.getCommunicationPreferences(user?.id);
      if (prefs && Object.keys(prefs)?.length > 0) {
        setSettings(prev => ({ ...prev, ...prefs }));
      }
    } catch (err) {
      console.error('Error loading notification settings:', err);
    } finally {
      setPageLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadSettings();
    }
  }, [isAuthenticated, user?.id, loadSettings]);

  const update = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const toggleDay = (day) => {
    const current = settings?.active_days || [];
    const updated = current?.includes(day)
      ? current?.filter(d => d !== day)
      : [...current, day];
    update('active_days', updated);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    try {
      setSaving(true);
      await preferencesService?.updatePreferences(user?.id, { communication: settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving notification settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading settings…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Notification Settings – GoShuttle</title>
      </Helmet>
      <Header />
      <main className="pt-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

          {/* Page Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
            >
              <Icon name="ArrowLeft" size={16} />
              Back
            </button>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Control how and when GoShuttle contacts you.</p>
              </div>
              {saved && (
                <div className="flex items-center gap-1.5 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
                  <Icon name="CheckCircle" size={15} />
                  Saved
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">

            {/* ── Channel Opt-ins ── */}
            <SectionCard icon="Bell" title="Notification Channels" description="Choose which channels you want to receive notifications on">
              <SettingRow
                label="Email notifications"
                sublabel={userProfile?.email || user?.email}
              >
                <Toggle checked={settings?.email_enabled} onChange={v => update('email_enabled', v)} />
              </SettingRow>
              <SettingRow
                label="SMS notifications"
                sublabel={userProfile?.phone || 'Add a phone number in your profile'}
              >
                <Toggle checked={settings?.sms_enabled} onChange={v => update('sms_enabled', v)} />
              </SettingRow>
              <SettingRow
                label="Push notifications"
                sublabel="Browser and in-app alerts"
              >
                <Toggle checked={settings?.push_enabled} onChange={v => update('push_enabled', v)} />
              </SettingRow>
            </SectionCard>

            {/* ── Email Preferences ── */}
            {settings?.email_enabled && (
              <SectionCard icon="Mail" title="Email Preferences" description="Select which emails you want to receive">
                <SettingRow label="Booking confirmation" sublabel="Sent immediately after a booking is made">
                  <Toggle checked={settings?.email_booking_confirmation} onChange={v => update('email_booking_confirmation', v)} />
                </SettingRow>
                <SettingRow label="Booking reminders" sublabel="Reminder before your scheduled trip">
                  <Toggle checked={settings?.email_booking_reminder} onChange={v => update('email_booking_reminder', v)} />
                </SettingRow>
                <SettingRow label="Cancellation notices" sublabel="When a booking is cancelled">
                  <Toggle checked={settings?.email_booking_cancellation} onChange={v => update('email_booking_cancellation', v)} />
                </SettingRow>
                <SettingRow label="Driver assigned" sublabel="When a driver is assigned to your trip">
                  <Toggle checked={settings?.email_driver_assigned} onChange={v => update('email_driver_assigned', v)} />
                </SettingRow>
                <SettingRow label="Trip completed" sublabel="Receipt and summary after each trip">
                  <Toggle checked={settings?.email_trip_completed} onChange={v => update('email_trip_completed', v)} />
                </SettingRow>
                <SettingRow label="Monthly expense report" sublabel="Corporate spending summary every month">
                  <Toggle checked={settings?.email_monthly_report} onChange={v => update('email_monthly_report', v)} />
                </SettingRow>
                <SettingRow label="Team invitations" sublabel="When someone invites you to a corporate team">
                  <Toggle checked={settings?.email_team_invitations} onChange={v => update('email_team_invitations', v)} />
                </SettingRow>
                <SettingRow label="Promotions & offers" sublabel="Deals, discounts, and GoShuttle news">
                  <Toggle checked={settings?.email_promotions} onChange={v => update('email_promotions', v)} />
                </SettingRow>

                {/* Email frequency */}
                <div className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-800 mb-3">Email frequency</p>
                  <div className="grid grid-cols-2 gap-2">
                    {FREQUENCY_OPTIONS?.map(opt => (
                      <button
                        key={opt?.value}
                        onClick={() => update('email_frequency', opt?.value)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                          settings?.email_frequency === opt?.value
                            ? 'bg-primary text-white border-primary' :'bg-white text-gray-600 border-gray-200 hover:border-primary/40'
                        }`}
                      >
                        {opt?.label}
                      </button>
                    ))}
                  </div>
                </div>
              </SectionCard>
            )}

            {/* ── SMS Preferences ── */}
            {settings?.sms_enabled && (
              <SectionCard icon="MessageSquare" title="SMS Preferences" description="Select which text messages you want to receive">
                <SettingRow label="Booking confirmation" sublabel="Instant SMS when booking is created">
                  <Toggle checked={settings?.sms_booking_confirmation} onChange={v => update('sms_booking_confirmation', v)} />
                </SettingRow>
                <SettingRow label="Booking reminders" sublabel="SMS reminder before your trip">
                  <Toggle checked={settings?.sms_booking_reminder} onChange={v => update('sms_booking_reminder', v)} />
                </SettingRow>
                <SettingRow label="Driver assigned" sublabel="Driver name and contact when assigned">
                  <Toggle checked={settings?.sms_driver_assigned} onChange={v => update('sms_driver_assigned', v)} />
                </SettingRow>
                <SettingRow label="Live trip updates" sublabel="Driver en route, arrived, trip started">
                  <Toggle checked={settings?.sms_trip_updates} onChange={v => update('sms_trip_updates', v)} />
                </SettingRow>
                <SettingRow label="Promotions & offers" sublabel="Occasional deals via SMS">
                  <Toggle checked={settings?.sms_promotions} onChange={v => update('sms_promotions', v)} />
                </SettingRow>

                {/* SMS frequency */}
                <div className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-800 mb-3">SMS frequency</p>
                  <div className="grid grid-cols-2 gap-2">
                    {FREQUENCY_OPTIONS?.slice(0, 2)?.map(opt => (
                      <button
                        key={opt?.value}
                        onClick={() => update('sms_frequency', opt?.value)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                          settings?.sms_frequency === opt?.value
                            ? 'bg-primary text-white border-primary' :'bg-white text-gray-600 border-gray-200 hover:border-primary/40'
                        }`}
                      >
                        {opt?.label}
                      </button>
                    ))}
                  </div>
                </div>
              </SectionCard>
            )}

            {/* ── Delivery Time Preferences ── */}
            <SectionCard icon="Clock" title="Delivery Time Preferences" description="Set when you prefer to receive non-urgent notifications">

              {/* Preferred delivery time */}
              <div className="px-6 py-4">
                <p className="text-sm font-medium text-gray-800 mb-1">Preferred delivery time</p>
                <p className="text-xs text-gray-500 mb-3">Digest emails and non-urgent alerts will be sent at this time</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {TIME_SLOTS?.map(slot => (
                    <button
                      key={slot?.value}
                      onClick={() => update('preferred_delivery_time', slot?.value)}
                      className={`px-2 py-2 rounded-xl text-xs font-medium border transition-all ${
                        settings?.preferred_delivery_time === slot?.value
                          ? 'bg-primary text-white border-primary' :'bg-white text-gray-600 border-gray-200 hover:border-primary/40'
                      }`}
                    >
                      {slot?.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active days */}
              <div className="px-6 py-4 border-t border-gray-50">
                <p className="text-sm font-medium text-gray-800 mb-1">Active days</p>
                <p className="text-xs text-gray-500 mb-3">Receive notifications only on selected days</p>
                <div className="flex gap-2 flex-wrap">
                  {DAYS?.map((day, i) => {
                    const val = DAY_VALUES?.[i];
                    const active = settings?.active_days?.includes(val);
                    return (
                      <button
                        key={val}
                        onClick={() => toggleDay(val)}
                        className={`w-10 h-10 rounded-xl text-xs font-semibold border transition-all ${
                          active
                            ? 'bg-primary text-white border-primary' :'bg-white text-gray-500 border-gray-200 hover:border-primary/40'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quiet hours */}
              <SettingRow
                label="Quiet hours"
                sublabel="Pause all non-urgent notifications during set hours"
              >
                <Toggle checked={settings?.quiet_hours_enabled} onChange={v => update('quiet_hours_enabled', v)} />
              </SettingRow>

              {settings?.quiet_hours_enabled && (
                <div className="px-6 pb-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Start time</label>
                    <select
                      value={settings?.quiet_start}
                      onChange={e => update('quiet_start', e?.target?.value)}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                    >
                      {TIME_SLOTS?.map(slot => (
                        <option key={slot?.value} value={slot?.value}>{slot?.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">End time</label>
                    <select
                      value={settings?.quiet_end}
                      onChange={e => update('quiet_end', e?.target?.value)}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                    >
                      {TIME_SLOTS?.map(slot => (
                        <option key={slot?.value} value={slot?.value}>{slot?.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </SectionCard>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-2 pb-8">
              <p className="text-xs text-gray-400">Changes are saved to your account profile.</p>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Icon name="Save" size={16} />
                    Save Settings
                  </>
                )}
              </Button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default NotificationSettings;
