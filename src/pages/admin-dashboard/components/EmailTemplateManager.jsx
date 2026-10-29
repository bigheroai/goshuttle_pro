import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

import { supabase } from '../../../lib/supabase';
import EmailTemplateEditor from './EmailTemplateEditor';
import EmailTestPanel from './EmailTestPanel';

const TEMPLATE_CATEGORIES = [
  {
    id: 'bookings',
    label: 'Bookings',
    icon: 'Calendar',
    color: 'blue',
    keys: ['customer_confirmation', 'admin_notification', 'booking_cancelled'],
    description: 'Booking confirmations, admin alerts, and cancellation notices'
  },
  {
    id: 'trips',
    label: 'Trip Updates',
    icon: 'Navigation',
    color: 'amber',
    keys: ['trip_assigned', 'trip_started', 'trip_completed'],
    description: 'Driver assignment, trip start, and completion notifications'
  },
  {
    id: 'kyc',
    label: 'KYC & Drivers',
    icon: 'UserCheck',
    color: 'green',
    keys: ['kyc_approved', 'kyc_rejected', 'welcome_email'],
    description: 'Driver KYC approval/rejection and partner welcome emails'
  },
  {
    id: 'account',
    label: 'Account Changes',
    icon: 'Settings',
    color: 'purple',
    keys: ['account_password_reset', 'account_deactivated', 'account_profile_updated'],
    description: 'Password resets, account deactivation, and profile update alerts'
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: 'CreditCard',
    color: 'emerald',
    keys: ['payment_receipt', 'refund_notice'],
    description: 'Payment receipts and refund notifications'
  }
];

const COLOR_MAP = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', header: 'bg-blue-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', header: 'bg-amber-500' },
  green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', badge: 'bg-green-100 text-green-700', header: 'bg-green-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-700', header: 'bg-purple-600' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', header: 'bg-emerald-600' },
};

const EmailTemplateManager = () => {
  const [activeView, setActiveView] = useState('overview');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sendingTest, setSendingTest] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase?.from('email_templates')?.select('*')?.order('template_name');
      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async (key) => {
    try {
      setSendingTest(key);
      const { error } = await supabase?.functions?.invoke('send-booking-confirmation', {
        body: { templateKey: key, test: true },
      });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to send test email:', err);
    } finally {
      setSendingTest(null);
    }
  };

  const getTemplatesByCategory = (keys) => {
    return templates?.filter(t => keys?.includes(t?.template_key));
  };

  const totalTemplates = templates?.length;
  const activeTemplates = templates?.filter(t => t?.is_active)?.length;

  if (activeView === 'editor') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('overview')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <Icon name="ArrowLeft" size={16} />
            Back to Overview
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700">
            {selectedCategory ? `Editing: ${TEMPLATE_CATEGORIES?.find(c => c?.id === selectedCategory)?.label} Templates` : 'All Templates'}
          </span>
        </div>
        <EmailTemplateEditor />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Icon name="Mail" size={20} className="text-blue-600" />
            Email Template Manager
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage all automated email templates — from booking confirmations to account notifications.
          </p>
        </div>
        <Button
          onClick={() => { setSelectedCategory(null); setActiveView('editor'); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm whitespace-nowrap"
        >
          <Icon name="Edit3" size={14} className="mr-1.5" />
          Open Template Editor
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon name="FileText" size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{loading ? '—' : totalTemplates}</p>
              <p className="text-xs text-gray-500">Total Templates</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <Icon name="CheckCircle" size={16} className="text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{loading ? '—' : activeTemplates}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
              <Icon name="Layers" size={16} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{TEMPLATE_CATEGORIES?.length}</p>
              <p className="text-xs text-gray-500">Categories</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
              <Icon name="Zap" size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">Resend</p>
              <p className="text-xs text-gray-500">Email Provider</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Email Test Panel */}
      <EmailTestPanel />

      {/* Category Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {TEMPLATE_CATEGORIES?.map(category => {
          const colors = COLOR_MAP?.[category?.color] || COLOR_MAP?.blue;
          const categoryTemplates = getTemplatesByCategory(category?.keys);
          const activeCount = categoryTemplates?.filter(t => t?.is_active)?.length;

          return (
            <div key={category?.id} className={`bg-white rounded-lg border ${colors?.border} overflow-hidden`}>
              {/* Card Header */}
              <div className={`${colors?.bg} px-5 py-4 border-b ${colors?.border}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm`}>
                      <Icon name={category?.icon} size={16} className={colors?.icon} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{category?.label}</h4>
                      <p className="text-xs text-gray-500">{category?.description}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors?.badge}`}>
                    {loading ? '—' : `${activeCount}/${category?.keys?.length}`} active
                  </span>
                </div>
              </div>

              {/* Template List */}
              <div className="divide-y divide-gray-100">
                {loading ? (
                  <div className="px-5 py-4 flex items-center gap-2 text-gray-400">
                    <Icon name="Loader2" size={14} className="animate-spin" />
                    <span className="text-sm">Loading templates...</span>
                  </div>
                ) : category?.keys?.map(key => {
                  const template = templates?.find(t => t?.template_key === key);
                  return (
                    <div key={key} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${template?.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {template?.template_name || key}
                          </p>
                          <p className="text-xs text-gray-400 font-mono truncate">{key}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {template ? (
                          <button
                            onClick={() => handleSendTest(key)}
                            disabled={sendingTest === key}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                          >
                            {sendingTest === key ? (
                              <Icon name="Loader2" size={11} className="animate-spin" />
                            ) : (
                              <Icon name="Send" size={11} />
                            )}
                            Test
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Not in DB</span>
                        )}
                        <button
                          onClick={() => { setSelectedCategory(category?.id); setActiveView('editor'); }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium ${colors?.badge} hover:opacity-80 transition-opacity`}
                        >
                          <Icon name="Edit3" size={11} />
                          Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Card Footer */}
              <div className={`px-5 py-3 ${colors?.bg} border-t ${colors?.border}`}>
                <button
                  onClick={() => { setSelectedCategory(category?.id); setActiveView('editor'); }}
                  className={`text-xs font-medium ${colors?.icon} hover:underline flex items-center gap-1`}
                >
                  <Icon name="ExternalLink" size={11} />
                  Edit all {category?.label} templates
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Automation Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon name="Zap" size={18} className="text-blue-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Automated Email Triggers</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
              {[
                { event: 'New booking submitted', template: 'customer_confirmation + admin_notification' },
                { event: 'Booking cancelled', template: 'booking_cancelled' },
                { event: 'Driver assigned to booking', template: 'trip_assigned' },
                { event: 'Trip started', template: 'trip_started' },
                { event: 'Trip completed', template: 'trip_completed' },
                { event: 'KYC application approved', template: 'kyc_approved' },
                { event: 'KYC application rejected', template: 'kyc_rejected' },
                { event: 'New user registration', template: 'welcome_email' },
                { event: 'Payment received', template: 'payment_receipt' },
                { event: 'Refund processed', template: 'refund_notice' },
                { event: 'Account deactivated', template: 'account_deactivated' },
                { event: 'Profile updated', template: 'account_profile_updated' },
              ]?.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Icon name="CheckCircle" size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-medium text-gray-700">{item?.event}</span>
                    <span className="text-xs text-gray-400 ml-1">→ {item?.template}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              All emails are sent via <strong>Resend API</strong> through the <code className="bg-white px-1 py-0.5 rounded text-xs border border-gray-200">send-booking-confirmation</code> edge function. Templates are loaded from the database — no redeployment needed after edits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplateManager;
