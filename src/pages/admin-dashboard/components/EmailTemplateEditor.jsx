import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

/**
 * Sanitize HTML for safe preview rendering — strips scripts, iframes, and on* handlers.
 */
function sanitizeHtml(html) {
  if (!html) return '';
  return html?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')?.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')?.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')?.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '')?.replace(/href\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'href="#"')?.replace(/src\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'src=""');
}

const VARIABLE_DOCS = {
  customer_confirmation: ['{{booking_id}}', '{{customer_name}}', '{{pickup_location}}', '{{dropoff_location}}', '{{vehicle_name}}', '{{passenger_count}}', '{{pickup_date}}', '{{pickup_time}}', '{{total_cost}}', '{{confirm_url}}'],
  admin_notification: ['{{booking_id}}', '{{customer_name}}', '{{customer_email}}', '{{pickup_location}}', '{{dropoff_location}}', '{{vehicle_name}}', '{{pickup_date}}', '{{pickup_time}}', '{{passenger_count}}', '{{total_cost}}'],
  booking_cancelled: ['{{booking_id}}', '{{customer_name}}', '{{pickup_location}}', '{{dropoff_location}}', '{{pickup_date}}'],
  welcome_email: ['{{customer_name}}', '{{customer_email}}'],
};

const EmailTemplateEditor = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [editForm, setEditForm] = useState({ subject: '', html_body: '', template_name: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [previewMode, setPreviewMode] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        ?.from('email_templates')
        ?.select('*')
        ?.order('template_name');

      if (error) throw error;
      setTemplates(data || []);
      if (data?.length > 0 && !selectedKey) {
        selectTemplate(data?.[0]);
      }
    } catch (err) {
      setMessage({ type: 'error', text: '❌ Failed to load templates: ' + err?.message });
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = (template) => {
    setSelectedKey(template?.template_key);
    setEditForm({
      subject: template?.subject || '',
      html_body: template?.html_body || '',
      template_name: template?.template_name || '',
    });
    setPreviewMode(false);
    setMessage({ type: '', text: '' });
  };

  const handleSave = async () => {
    if (!selectedKey) return;
    try {
      setSaving(true);
      setMessage({ type: 'info', text: '💾 Saving template...' });

      const { error } = await supabase
        ?.from('email_templates')
        ?.update({
          subject: editForm?.subject,
          html_body: editForm?.html_body,
          template_name: editForm?.template_name,
          updated_at: new Date()?.toISOString(),
          updated_by: user?.id,
        })
        ?.eq('template_key', selectedKey);

      if (error) throw error;

      setTemplates(prev =>
        prev?.map(t =>
          t?.template_key === selectedKey
            ? { ...t, subject: editForm?.subject, html_body: editForm?.html_body, template_name: editForm?.template_name }
            : t
        )
      );
      setMessage({ type: 'success', text: '✅ Template saved! The edge function will use this template for future emails.' });
    } catch (err) {
      setMessage({ type: 'error', text: '❌ Failed to save: ' + err?.message });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selectedKey || !window.confirm('Reset this template to the default version? This cannot be undone.')) return;
    const original = templates?.find(t => t?.template_key === selectedKey);
    if (original) {
      setEditForm({
        subject: original?.subject || '',
        html_body: original?.html_body || '',
        template_name: original?.template_name || '',
      });
      setMessage({ type: 'info', text: 'ℹ️ Template reset to saved version. Click Save to confirm.' });
    }
  };

  const handleSendTest = async () => {
    if (!testEmail?.trim()) {
      setMessage({ type: 'error', text: '❌ Please enter a test email address.' });
      return;
    }
    try {
      setSendingTest(true);
      setMessage({ type: 'info', text: '📤 Sending test email...' });

      const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY;

      const sampleData = {
        booking_id: 'TEST-' + Date.now(),
        customer_name: 'Test Customer',
        customer_email: testEmail,
        pickup_location: 'NAIA Terminal 3, Pasay City',
        dropoff_location: 'Makati CBD, Ayala Avenue',
        vehicle_name: 'Toyota HiAce Executive',
        vehicle_type: 'Executive Van',
        passenger_count: 4,
        pickup_date: new Date()?.toLocaleDateString('en-PH'),
        pickup_time: '10:00 AM',
        total_cost: '2500.00',
        confirm_url: `https://goshuttle.ph/booking-lookup?code=TEST-001&action=confirm`,
      };

      const payload = {
        type: selectedKey === 'admin_notification' ? 'admin_notification' : selectedKey === 'welcome_email' ? 'welcome_email' : 'customer_confirmation',
        to_email: testEmail,
        customer_email: testEmail,
        admin_email: testEmail,
        booking_data: sampleData,
        test_data: sampleData,
        // Pass custom template override for preview
        custom_subject: editForm?.subject,
        custom_html: editForm?.html_body,
      };

      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-booking-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(payload),
      });

      const result = await response?.json();
      if (!response?.ok || result?.success === false) {
        throw new Error(result?.error || `HTTP ${response?.status}`);
      }
      setMessage({ type: 'success', text: `✅ Test email sent to ${testEmail}! Check your inbox.` });
    } catch (err) {
      setMessage({ type: 'error', text: '❌ Test send failed: ' + err?.message });
    } finally {
      setSendingTest(false);
    }
  };

  const insertVariable = (variable) => {
    const textarea = document?.getElementById('html-body-editor');
    if (textarea) {
      const start = textarea?.selectionStart;
      const end = textarea?.selectionEnd;
      const newValue = editForm?.html_body?.substring(0, start) + variable + editForm?.html_body?.substring(end);
      setEditForm(prev => ({ ...prev, html_body: newValue }));
      setTimeout(() => {
        textarea?.focus();
        textarea?.setSelectionRange(start + variable?.length, start + variable?.length);
      }, 0);
    } else {
      setEditForm(prev => ({ ...prev, html_body: prev?.html_body + variable }));
    }
  };

  const selectedTemplate = templates?.find(t => t?.template_key === selectedKey);
  const availableVars = VARIABLE_DOCS?.[selectedKey] || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="Loader2" className="animate-spin mr-2 text-blue-500" size={20} />
        <span className="text-gray-600">Loading email templates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Icon name="FileText" size={20} className="text-blue-600" />
            Email Template Editor
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Edit email templates stored in the database — no edge function redeploy needed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
            DB-Driven
          </span>
        </div>
      </div>

      {/* Message */}
      {message?.text && (
        <div className={`flex items-start gap-3 p-4 rounded-lg border ${
          message?.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          message?.type === 'error'? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <Icon
            name={message?.type === 'success' ? 'CheckCircle' : message?.type === 'error' ? 'AlertCircle' : 'Info'}
            size={16}
            className="mt-0.5 flex-shrink-0"
          />
          <p className="text-sm font-medium flex-1">{message?.text}</p>
          <button onClick={() => setMessage({ type: '', text: '' })} className="text-current opacity-60 hover:opacity-100">
            <Icon name="X" size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-white">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Templates</p>
            </div>
            <div className="divide-y divide-gray-100">
              {templates?.map(template => (
                <button
                  key={template?.template_key}
                  onClick={() => selectTemplate(template)}
                  className={`w-full text-left px-4 py-3 transition-colors hover:bg-white ${
                    selectedKey === template?.template_key
                      ? 'bg-white border-l-2 border-blue-500' :'border-l-2 border-transparent'
                  }`}
                >
                  <p className={`text-sm font-medium truncate ${selectedKey === template?.template_key ? 'text-blue-700' : 'text-gray-800'}`}>
                    {template?.template_name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{template?.template_key}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-3 space-y-4">
          {selectedTemplate ? (
            <>
              {/* Template Name & Subject */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Template Name</label>
                  <Input
                    type="text"
                    value={editForm?.template_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, template_name: e?.target?.value }))}
                    placeholder="Template display name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Subject
                    <span className="ml-2 text-xs text-gray-400 font-normal">Supports variables</span>
                  </label>
                  <Input
                    type="text"
                    value={editForm?.subject}
                    onChange={(e) => setEditForm(prev => ({ ...prev, subject: e?.target?.value }))}
                    placeholder="Email subject line"
                  />
                </div>
              </div>

              {/* Available Variables */}
              {availableVars?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                    <Icon name="Code" size={13} />
                    Available Variables — click to insert at cursor
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableVars?.map(v => (
                      <button
                        key={v}
                        onClick={() => insertVariable(v)}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-colors"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* HTML Body Editor / Preview Toggle */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700">HTML Body</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewMode(false)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${!previewMode ? 'bg-white shadow text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <Icon name="Code" size={12} className="inline mr-1" />
                      Edit HTML
                    </button>
                    <button
                      onClick={() => setPreviewMode(true)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${previewMode ? 'bg-white shadow text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <Icon name="Eye" size={12} className="inline mr-1" />
                      Preview
                    </button>
                  </div>
                </div>

                {previewMode ? (
                  <div className="p-4 bg-gray-100 min-h-64">
                    <div className="max-w-2xl mx-auto bg-white rounded shadow-sm overflow-hidden">
                      <div
                        className="p-2"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(
                            (editForm?.html_body
                            ?.replace(/\{\{booking_id\}\}/g, 'TEST-001')
                            ?.replace(/\{\{customer_name\}\}/g, 'Maria Santos')
                            ?.replace(/\{\{customer_email\}\}/g, 'maria@example.com')
                            ?.replace(/\{\{pickup_location\}\}/g, 'NAIA Terminal 3')
                            ?.replace(/\{\{dropoff_location\}\}/g, 'Makati CBD')
                            ?.replace(/\{\{vehicle_name\}\}/g, 'Toyota HiAce Executive')
                            ?.replace(/\{\{passenger_count\}\}/g, '4')
                            ?.replace(/\{\{pickup_date\}\}/g, 'Dec 25, 2024')
                            ?.replace(/\{\{pickup_time\}\}/g, '10:00 AM')
                            ?.replace(/\{\{total_cost\}\}/g, '2,500.00')
                            ?.replace(/\{\{confirm_url\}\}/g, '#')) || ''
                          )
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <textarea
                    id="html-body-editor"
                    value={editForm?.html_body}
                    onChange={(e) => setEditForm(prev => ({ ...prev, html_body: e?.target?.value }))}
                    rows={20}
                    className="w-full px-5 py-4 font-mono text-xs text-gray-800 bg-gray-50 border-0 focus:ring-0 focus:outline-none resize-y"
                    placeholder="Enter HTML email body..."
                    spellCheck={false}
                  />
                )}
              </div>

              {/* Description */}
              {selectedTemplate?.description && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <Icon name="Info" size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">{selectedTemplate?.description}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e?.target?.value)}
                    placeholder="test@example.com"
                    className="text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendTest}
                    disabled={sendingTest}
                    className="whitespace-nowrap text-sm"
                  >
                    {sendingTest ? (
                      <><Icon name="Loader2" size={14} className="animate-spin mr-1.5" />Sending...</>
                    ) : (
                      <><Icon name="Send" size={14} className="mr-1.5" />Send Test</>
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    className="text-sm"
                  >
                    <Icon name="RotateCcw" size={14} className="mr-1.5" />
                    Discard
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {saving ? (
                      <><Icon name="Loader2" size={14} className="animate-spin mr-1.5" />Saving...</>
                    ) : (
                      <><Icon name="Save" size={14} className="mr-1.5" />Save Template</>
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <div className="text-center">
                <Icon name="FileText" size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Select a template to edit</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailTemplateEditor;
