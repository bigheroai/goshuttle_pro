import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

const PaymentGateways = () => {
  const { user } = useAuth();

  const [paymongoSettings, setPaymongoSettings] = useState({
    enabled: false,
    mode: 'test',
    public_key_test: '',
    secret_key_test: '',
    public_key_live: '',
    secret_key_live: '',
    webhook_secret: '',
    supported_methods: {
      gcash: true,
      maya: true,
      grab_pay: false,
      card: true,
      dob: false,
      dob_ubp: false,
      billease: false,
      qrph: false,
    },
    checkout_description: 'GoShuttle Booking Payment',
    statement_descriptor: 'GOSHUTTLE',
    success_url: '',
    cancel_url: '',
  });
  const [savingPaymongo, setSavingPaymongo] = useState(false);

  const [paymentMethodsAvailability, setPaymentMethodsAvailability] = useState({
    gcash: true,
    maya: true,
    grab_pay: true,
    card: true,
    qr_ph: true,
    online_banking: true,
    billease: true
  });
  const [cashEnabled, setCashEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [sectionMessages, setSectionMessages] = useState({
    payment: { success: '', error: '', info: '' },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase?.from('app_settings')?.select('*');
      if (error) return;

      const settingsObj = {};
      data?.forEach(setting => {
        settingsObj[setting.setting_key] = setting?.setting_value;
      });

      const availabilityConfig = settingsObj?.payment_methods_availability || {};
      setPaymentMethodsAvailability({
        gcash: availabilityConfig?.gcash !== false,
        maya: availabilityConfig?.maya !== false,
        grab_pay: availabilityConfig?.grab_pay !== false,
        card: availabilityConfig?.card !== false,
        qr_ph: availabilityConfig?.qr_ph !== false,
        online_banking: availabilityConfig?.online_banking !== false,
        billease: availabilityConfig?.billease !== false
      });
      setCashEnabled(settingsObj?.cash_payment_enabled !== false);

      const pmConfig = settingsObj?.paymongo_gateway_settings || {};
      if (pmConfig && Object.keys(pmConfig)?.length > 0) {
        setPaymongoSettings(prev => ({
          ...prev,
          enabled: pmConfig?.enabled ?? false,
          mode: pmConfig?.mode || 'test',
          public_key_test: pmConfig?.public_key_test || '',
          secret_key_test: pmConfig?.secret_key_test || '',
          public_key_live: pmConfig?.public_key_live || '',
          secret_key_live: pmConfig?.secret_key_live || '',
          webhook_secret: pmConfig?.webhook_secret || '',
          supported_methods: { ...prev?.supported_methods, ...(pmConfig?.supported_methods || {}) },
          checkout_description: pmConfig?.checkout_description || 'GoShuttle Booking Payment',
          statement_descriptor: pmConfig?.statement_descriptor || 'GOSHUTTLE',
          success_url: pmConfig?.success_url || '',
          cancel_url: pmConfig?.cancel_url || '',
        }));
      }
    } catch (error) {
      console.error('Error loading payment settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const setSectionMessage = (section, type, message) => {
    setSectionMessages(prev => ({
      ...prev,
      [section]: {
        success: type === 'success' ? message : '',
        error: type === 'error' ? message : '',
        info: type === 'info' ? message : '',
      }
    }));
    if (type !== 'error') {
      setTimeout(() => {
        setSectionMessages(prev => ({
          ...prev,
          [section]: { success: '', error: '', info: '' }
        }));
      }, 8000);
    }
  };

  const handleSave = async (settingKey, settingValue) => {
    const { error } = await supabase
      ?.from('app_settings')
      ?.upsert({
        setting_key: settingKey,
        setting_value: settingValue,
        updated_at: new Date()?.toISOString(),
        updated_by: user?.id
      }, { onConflict: 'setting_key' });

    if (error) throw new Error(error?.message);
  };

  const savePaymentMethodsAvailability = async () => {
    try {
      setSaving(true);
      setSectionMessage('payment', 'info', '💾 Saving payment method availability...');
      await handleSave('payment_methods_availability', paymentMethodsAvailability);
      await handleSave('cash_payment_enabled', cashEnabled);
      setSectionMessage('payment', 'success', '✅ Payment method availability saved! Customers will see the updated options.');
    } catch (error) {
      setSectionMessage('payment', 'error', '❌ Failed to save payment method availability: ' + (error?.message || 'Unexpected error'));
    } finally {
      setSaving(false);
    }
  };

  const savePaymongoSettings = async () => {
    try {
      setSavingPaymongo(true);
      setSectionMessage('payment', 'info', '💾 Saving PayMongo gateway settings...');

      const activeKey = paymongoSettings?.mode === 'live'
        ? paymongoSettings?.public_key_live
        : paymongoSettings?.public_key_test;

      if (paymongoSettings?.enabled && !activeKey?.trim()) {
        setSectionMessage('payment', 'error', `❌ ${paymongoSettings?.mode === 'live' ? 'Live' : 'Test'} Public Key is required when PayMongo is enabled.`);
        return;
      }

      const configToSave = {
        ...paymongoSettings,
        updated_at: new Date()?.toISOString(),
        updated_by: user?.id,
      };

      await handleSave('paymongo_gateway_settings', configToSave);
      setSectionMessage('payment', 'success', '✅ PayMongo gateway settings saved successfully!');
    } catch (err) {
      setSectionMessage('payment', 'error', '❌ Failed to save PayMongo settings: ' + (err?.message || 'Unexpected error'));
    } finally {
      setSavingPaymongo(false);
    }
  };

  const renderSectionMessage = (section) => {
    const messages = sectionMessages?.[section];
    if (!messages?.success && !messages?.error && !messages?.info) return null;

    const messageType = messages?.success ? 'success' : messages?.error ? 'error' : 'info';
    const messageContent = messages?.success || messages?.error || messages?.info;

    return (
      <div
        className={`p-4 rounded-lg border mb-6 transition-all duration-300 ${
          messageType === 'success' ? 'bg-green-50 border-green-200' :
          messageType === 'error'? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
        } shadow-sm`}
      >
        <div className="flex items-start">
          <Icon
            name={messageType === 'success' ? 'CheckCircle' : messageType === 'error' ? 'AlertCircle' : 'Info'}
            className={`mt-0.5 mr-3 ${
              messageType === 'success' ? 'text-green-500' :
              messageType === 'error' ? 'text-red-500' : 'text-blue-500'
            }`}
            size={20}
          />
          <p className={`text-sm font-medium flex-1 ${
            messageType === 'success' ? 'text-green-800' :
            messageType === 'error' ? 'text-red-800' : 'text-blue-800'
          }`}>
            {messageContent}
          </p>
          <button
            onClick={() => setSectionMessages(prev => ({ ...prev, [section]: { success: '', error: '', info: '' } }))}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <Icon name="X" size={16} />
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="Loader2" className="animate-spin mr-2" size={20} />
        <span className="text-gray-600">Loading payment gateway settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Icon name="CreditCard" className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Gateways</h1>
            <p className="text-gray-600 mt-1">
              Configure PayMongo payment gateway and manage available payment methods for customers
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Icon name="ToggleRight" size={12} className="mr-1" />
            Payment Methods
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <Icon name="Key" size={12} className="mr-1" />
            API Keys
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Icon name="Zap" size={12} className="mr-1" />
            Powered by PayMongo
          </span>
        </div>
      </div>

      {/* PayMongo Payment Methods */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Icon name="ToggleRight" className="mr-2" size={20} />
              PayMongo Payment Methods
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Enable or disable the payment methods available to customers via PayMongo
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            <Icon name="Zap" size={12} /> Powered by PayMongo
          </span>
        </div>

        {renderSectionMessage('payment')}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 mt-4">
          {[
            { key: 'gcash', label: 'GCash', icon: 'Smartphone', color: 'blue', desc: 'GCash mobile wallet', badge: 'Most Popular' },
            { key: 'maya', label: 'Maya', icon: 'Wallet', color: 'green', desc: 'Maya digital payments', badge: null },
            { key: 'grab_pay', label: 'GrabPay', icon: 'Car', color: 'emerald', desc: 'GrabPay wallet', badge: null },
            { key: 'card', label: 'Card', icon: 'CreditCard', color: 'purple', desc: 'Visa, Mastercard, JCB', badge: null },
            { key: 'qr_ph', label: 'QR Ph', icon: 'QrCode', color: 'orange', desc: 'InstaPay / PESONet QR', badge: null },
            { key: 'online_banking', label: 'Online Banking', icon: 'Building2', color: 'indigo', desc: 'BancNet, UnionBank, etc.', badge: null },
            { key: 'billease', label: 'BillEase', icon: 'Receipt', color: 'pink', desc: 'Buy now, pay later', badge: 'BNPL' },
          ]?.map((method) => {
            const isEnabled = paymentMethodsAvailability?.[method?.key];
            const colorMap = {
              blue:    { bg: 'bg-blue-50 border-blue-200',    icon: 'text-blue-600 bg-blue-100',    badge: 'bg-blue-100 text-blue-700',    toggle: 'bg-blue-600' },
              green:   { bg: 'bg-green-50 border-green-200',  icon: 'text-green-600 bg-green-100',  badge: 'bg-green-100 text-green-700',  toggle: 'bg-green-600' },
              emerald: { bg: 'bg-emerald-50 border-emerald-200', icon: 'text-emerald-600 bg-emerald-100', badge: 'bg-emerald-100 text-emerald-700', toggle: 'bg-emerald-600' },
              purple:  { bg: 'bg-purple-50 border-purple-200', icon: 'text-purple-600 bg-purple-100', badge: 'bg-purple-100 text-purple-700', toggle: 'bg-purple-600' },
              orange:  { bg: 'bg-orange-50 border-orange-200', icon: 'text-orange-600 bg-orange-100', badge: 'bg-orange-100 text-orange-700', toggle: 'bg-orange-600' },
              indigo:  { bg: 'bg-indigo-50 border-indigo-200', icon: 'text-indigo-600 bg-indigo-100', badge: 'bg-indigo-100 text-indigo-700', toggle: 'bg-indigo-600' },
              pink:    { bg: 'bg-pink-50 border-pink-200',    icon: 'text-pink-600 bg-pink-100',    badge: 'bg-pink-100 text-pink-700',    toggle: 'bg-pink-600' },
            };
            const c = colorMap?.[method?.color];
            return (
              <div
                key={method?.key}
                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${isEnabled ? c?.bg : 'bg-gray-50 border-gray-200 opacity-60'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isEnabled ? c?.icon : 'text-gray-400 bg-gray-100'}`}>
                    <Icon name={method?.icon} size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-gray-900 text-sm">{method?.label}</p>
                      {method?.badge && (
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${isEnabled ? c?.badge : 'bg-gray-100 text-gray-400'}`}>
                          {method?.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{method?.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isEnabled ? c?.badge : 'bg-gray-100 text-gray-500'}`}>
                    {isEnabled ? 'On' : 'Off'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPaymentMethodsAvailability(prev => ({ ...prev, [method?.key]: !prev?.[method?.key] }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${isEnabled ? c?.toggle : 'bg-gray-300'} focus:ring-blue-500`}
                    aria-label={`Toggle ${method?.label}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Cash Payment Option */}
          <div
            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${cashEnabled ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cashEnabled ? 'text-yellow-600 bg-yellow-100' : 'text-gray-400 bg-gray-100'}`}>
                <Icon name="Banknote" size={20} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-gray-900 text-sm">Cash</p>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${cashEnabled ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-400'}`}>
                    On-site
                  </span>
                </div>
                <p className="text-xs text-gray-500">Pay in cash upon boarding</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cashEnabled ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                {cashEnabled ? 'On' : 'Off'}
              </span>
              <button
                type="button"
                onClick={() => setCashEnabled(prev => !prev)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${cashEnabled ? 'bg-yellow-500' : 'bg-gray-300'} focus:ring-yellow-400`}
                aria-label="Toggle Cash payment"
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${cashEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <Button
            type="button"
            onClick={savePaymentMethodsAvailability}
            disabled={saving}
            iconName="Save"
            iconPosition="left"
          >
            {saving ? 'Saving...' : 'Save Payment Method Settings'}
          </Button>
        </div>
      </div>

      {/* PayMongo Gateway Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Icon name="CreditCard" className="mr-2 text-blue-600" size={20} />
              PayMongo Gateway Settings
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Configure PayMongo as your primary checkout payment gateway for Philippine customers
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://dashboard.paymongo.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <Icon name="ExternalLink" size={12} />
              PayMongo Dashboard
            </a>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${paymongoSettings?.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              {paymongoSettings?.enabled ? '✅ Active' : '⏸ Inactive'}
            </span>
          </div>
        </div>

        {/* Enable Toggle */}
        <div className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
          <input
            type="checkbox"
            id="paymongo_enabled"
            checked={paymongoSettings?.enabled}
            onChange={(e) => setPaymongoSettings(prev => ({ ...prev, enabled: e?.target?.checked }))}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="paymongo_enabled" className="text-sm font-medium text-blue-900">
            <Icon name="Zap" size={14} className="inline mr-1" />
            Enable PayMongo as checkout payment gateway
          </label>
        </div>

        {/* Mode Toggle */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Icon name="Settings" size={14} className="inline mr-1" />
            Environment Mode
          </label>
          <div className="flex gap-4">
            <label className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${paymongoSettings?.mode === 'test' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}>
              <input
                type="radio"
                name="paymongo_mode"
                value="test"
                checked={paymongoSettings?.mode === 'test'}
                onChange={() => setPaymongoSettings(prev => ({ ...prev, mode: 'test' }))}
                className="h-4 w-4 text-yellow-500 border-gray-300 focus:ring-yellow-400"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">🧪 Test / Sandbox</p>
                <p className="text-xs text-gray-500">Use test keys for development</p>
              </div>
            </label>
            <label className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${paymongoSettings?.mode === 'live' ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <input
                type="radio"
                name="paymongo_mode"
                value="live"
                checked={paymongoSettings?.mode === 'live'}
                onChange={() => setPaymongoSettings(prev => ({ ...prev, mode: 'live' }))}
                className="h-4 w-4 text-green-500 border-gray-300 focus:ring-green-400"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">🔴 Live / Production</p>
                <p className="text-xs text-gray-500">Use live keys for real transactions</p>
              </div>
            </label>
          </div>
        </div>

        {/* API Keys */}
        <div className="space-y-6 mb-6">
          {/* Test Keys */}
          <div className={`rounded-lg border p-4 ${paymongoSettings?.mode === 'test' ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}>
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-yellow-200 text-yellow-800 flex items-center justify-center text-xs">T</span>
              Test / Sandbox API Keys
              {paymongoSettings?.mode === 'test' && <span className="text-xs text-yellow-700 font-normal">(Currently Active)</span>}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Icon name="Key" size={13} className="inline mr-1" />
                  Test Public Key
                </label>
                <Input
                  type="password"
                  value={paymongoSettings?.public_key_test}
                  onChange={(e) => setPaymongoSettings(prev => ({ ...prev, public_key_test: e?.target?.value }))}
                  placeholder="pk_test_..."
                />
                <p className="text-xs text-gray-500 mt-1">Starts with <code className="bg-gray-100 px-1 rounded">pk_test_</code></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Icon name="Lock" size={13} className="inline mr-1" />
                  Test Secret Key
                </label>
                <Input
                  type="password"
                  value={paymongoSettings?.secret_key_test}
                  onChange={(e) => setPaymongoSettings(prev => ({ ...prev, secret_key_test: e?.target?.value }))}
                  placeholder="sk_test_..."
                />
                <p className="text-xs text-gray-500 mt-1">Starts with <code className="bg-gray-100 px-1 rounded">sk_test_</code></p>
              </div>
            </div>
          </div>

          {/* Live Keys */}
          <div className={`rounded-lg border p-4 ${paymongoSettings?.mode === 'live' ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-green-200 text-green-800 flex items-center justify-center text-xs">L</span>
              Live / Production API Keys
              {paymongoSettings?.mode === 'live' && <span className="text-xs text-green-700 font-normal">(Currently Active)</span>}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Icon name="Key" size={13} className="inline mr-1" />
                  Live Public Key
                </label>
                <Input
                  type="password"
                  value={paymongoSettings?.public_key_live}
                  onChange={(e) => setPaymongoSettings(prev => ({ ...prev, public_key_live: e?.target?.value }))}
                  placeholder="pk_live_..."
                />
                <p className="text-xs text-gray-500 mt-1">Starts with <code className="bg-gray-100 px-1 rounded">pk_live_</code></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Icon name="Lock" size={13} className="inline mr-1" />
                  Live Secret Key
                </label>
                <Input
                  type="password"
                  value={paymongoSettings?.secret_key_live}
                  onChange={(e) => setPaymongoSettings(prev => ({ ...prev, secret_key_live: e?.target?.value }))}
                  placeholder="sk_live_..."
                />
                <p className="text-xs text-gray-500 mt-1">Starts with <code className="bg-gray-100 px-1 rounded">sk_live_</code></p>
              </div>
            </div>
          </div>

          {/* Webhook Secret */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Icon name="Webhook" size={13} className="inline mr-1" />
              Webhook Secret Key
            </label>
            <Input
              type="password"
              value={paymongoSettings?.webhook_secret}
              onChange={(e) => setPaymongoSettings(prev => ({ ...prev, webhook_secret: e?.target?.value }))}
              placeholder="whsec_..."
            />
            <p className="text-xs text-gray-500 mt-1">Used to verify webhook payloads from PayMongo. Get this from your PayMongo webhook settings.</p>
          </div>
        </div>

        {/* Supported Payment Methods */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Icon name="ToggleRight" size={14} className="inline mr-1" />
            Supported Payment Methods
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'gcash', label: 'GCash', icon: '📱', desc: 'GCash e-wallet' },
              { key: 'maya', label: 'Maya', icon: '💜', desc: 'Maya (PayMaya)' },
              { key: 'card', label: 'Credit/Debit Card', icon: '💳', desc: 'Visa, Mastercard' },
              { key: 'grab_pay', label: 'GrabPay', icon: '🟢', desc: 'Grab e-wallet' },
              { key: 'qrph', label: 'QR Ph', icon: '📷', desc: 'InstaPay QR' },
              { key: 'dob', label: 'Online Banking', icon: '🏦', desc: 'Direct online banking' },
              { key: 'dob_ubp', label: 'UnionBank', icon: '🏛', desc: 'UnionBank online' },
              { key: 'billease', label: 'BillEase', icon: '📋', desc: 'Buy now, pay later' },
            ]?.map((method) => {
              const isOn = paymongoSettings?.supported_methods?.[method?.key];
              return (
                <label
                  key={method?.key}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 cursor-pointer transition-all text-center ${isOn ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}
                >
                  <input
                    type="checkbox"
                    checked={!!isOn}
                    onChange={(e) => setPaymongoSettings(prev => ({
                      ...prev,
                      supported_methods: { ...prev?.supported_methods, [method?.key]: e?.target?.checked }
                    }))}
                    className="sr-only"
                  />
                  <span className="text-xl">{method?.icon}</span>
                  <span className="text-xs font-semibold text-gray-900">{method?.label}</span>
                  <span className="text-xs text-gray-500">{method?.desc}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${isOn ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {isOn ? 'On' : 'Off'}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Checkout Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Icon name="FileText" size={13} className="inline mr-1" />
              Checkout Description
            </label>
            <Input
              type="text"
              value={paymongoSettings?.checkout_description}
              onChange={(e) => setPaymongoSettings(prev => ({ ...prev, checkout_description: e?.target?.value }))}
              placeholder="GoShuttle Booking Payment"
            />
            <p className="text-xs text-gray-500 mt-1">Shown to customers on the PayMongo checkout page</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Icon name="Tag" size={13} className="inline mr-1" />
              Statement Descriptor
            </label>
            <Input
              type="text"
              value={paymongoSettings?.statement_descriptor}
              onChange={(e) => setPaymongoSettings(prev => ({ ...prev, statement_descriptor: e?.target?.value?.toUpperCase()?.slice(0, 22) }))}
              placeholder="GOSHUTTLE"
              maxLength={22}
            />
            <p className="text-xs text-gray-500 mt-1">Appears on customer bank/card statements (max 22 chars)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Icon name="CheckCircle" size={13} className="inline mr-1" />
              Success Redirect URL
            </label>
            <Input
              type="url"
              value={paymongoSettings?.success_url}
              onChange={(e) => setPaymongoSettings(prev => ({ ...prev, success_url: e?.target?.value }))}
              placeholder="https://goshuttle.ph/booking-confirmed"
            />
            <p className="text-xs text-gray-500 mt-1">Where customers land after successful payment</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Icon name="XCircle" size={13} className="inline mr-1" />
              Cancel / Failure Redirect URL
            </label>
            <Input
              type="url"
              value={paymongoSettings?.cancel_url}
              onChange={(e) => setPaymongoSettings(prev => ({ ...prev, cancel_url: e?.target?.value }))}
              placeholder="https://goshuttle.ph/booking"
            />
            <p className="text-xs text-gray-500 mt-1">Where customers land if they cancel or payment fails</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
          <div className="flex items-start gap-2">
            <Icon name="Info" className="text-blue-500 mt-0.5" size={16} />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">PayMongo Integration Notes</p>
              <ul className="text-xs space-y-1 text-blue-600">
                <li>• PayMongo is the recommended payment gateway for Philippine-based businesses</li>
                <li>• Supports GCash, Maya, credit/debit cards, and more local payment methods</li>
                <li>• Get your API keys from <strong>dashboard.paymongo.com → Developers → API Keys</strong></li>
                <li>• Set up webhooks at <strong>dashboard.paymongo.com → Developers → Webhooks</strong></li>
                <li>• Test mode transactions are free and do not charge real money</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button
            type="button"
            onClick={savePaymongoSettings}
            disabled={savingPaymongo}
            iconName="Save"
            iconPosition="left"
          >
            {savingPaymongo ? 'Saving...' : 'Save PayMongo Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentGateways;
