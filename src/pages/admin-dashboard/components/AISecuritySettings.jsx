import React, { useState, useEffect, useCallback } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { logAdminAction, AUDIT_ACTIONS } from '../../../utils/adminAuditLogger';

// ─── Domain Allow List Section ───────────────────────────────────────────────

const DomainAllowList = ({ userProfile }) => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editId, setEditId] = useState(null);
  const [editDomain, setEditDomain] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadDomains = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase?.from('domain_allowlist')?.select('*')?.order('domain', { ascending: true });
    if (!error) setDomains(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadDomains(); }, [loadDomains]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const validateDomain = (d) => {
    const trimmed = d?.trim()?.toLowerCase();
    if (!trimmed) return 'Domain is required';
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/?.test(trimmed)) return 'Enter a valid domain (e.g. company.com)';
    return null;
  };

  const handleAdd = async () => {
    const err = validateDomain(newDomain);
    if (err) { setError(err); return; }
    setError('');
    const { error: dbErr } = await supabase?.from('domain_allowlist')?.insert({
      domain: newDomain?.trim()?.toLowerCase(),
      description: newDesc?.trim() || null,
      added_by: userProfile?.id,
    });
    if (dbErr) { setError(dbErr?.message); return; }
    await logAdminAction({
      actionType: AUDIT_ACTIONS?.SETTINGS_UPDATED || 'SETTINGS_UPDATED',
      actorId: userProfile?.id,
      actorName: userProfile?.full_name,
      actorRole: userProfile?.role,
      description: `Added domain to allowlist: ${newDomain?.trim()?.toLowerCase()}`,
    });
    setNewDomain('');
    setNewDesc('');
    loadDomains();
    showSuccess('Domain added successfully');
  };

  const handleDelete = async (id, domain) => {
    if (!window.confirm(`Remove "${domain}" from the allow list?`)) return;
    await supabase?.from('domain_allowlist')?.delete()?.eq('id', id);
    await logAdminAction({
      actionType: AUDIT_ACTIONS?.SETTINGS_UPDATED || 'SETTINGS_UPDATED',
      actorId: userProfile?.id,
      actorName: userProfile?.full_name,
      actorRole: userProfile?.role,
      description: `Removed domain from allowlist: ${domain}`,
    });
    loadDomains();
    showSuccess('Domain removed');
  };

  const startEdit = (item) => {
    setEditId(item?.id);
    setEditDomain(item?.domain);
    setEditDesc(item?.description || '');
    setError('');
  };

  const handleSaveEdit = async () => {
    const err = validateDomain(editDomain);
    if (err) { setError(err); return; }
    setError('');
    await supabase?.from('domain_allowlist')?.update({
      domain: editDomain?.trim()?.toLowerCase(),
      description: editDesc?.trim() || null,
      updated_at: new Date()?.toISOString(),
    })?.eq('id', editId);
    setEditId(null);
    loadDomains();
    showSuccess('Domain updated');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
          <Icon name="Globe" size={18} className="text-green-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Domain Allow List</h3>
          <p className="text-xs text-gray-500">Domains always treated as valid by the AI scanner</p>
        </div>
        <span className="ml-auto bg-green-50 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full border border-green-200">
          {domains?.length} domains
        </span>
      </div>
      {/* Add new domain */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Add Domain</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e?.target?.value)}
            placeholder="e.g. company.com"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            onKeyDown={(e) => e?.key === 'Enter' && handleAdd()}
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e?.target?.value)}
            placeholder="Description (optional)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <Button onClick={handleAdd} className="whitespace-nowrap">
            <Icon name="Plus" size={14} className="mr-1" /> Add Domain
          </Button>
        </div>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        {success && <p className="text-green-600 text-xs mt-2">{success}</p>}
      </div>
      {/* Domain list */}
      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="Loader2" size={20} className="animate-spin text-gray-400" />
          </div>
        ) : domains?.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No domains in the allow list</div>
        ) : (
          domains?.map((item) => (
            <div key={item?.id} className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
              {editId === item?.id ? (
                <>
                  <input
                    value={editDomain}
                    onChange={(e) => setEditDomain(e?.target?.value)}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    value={editDesc}
                    onChange={(e) => setEditDesc(e?.target?.value)}
                    placeholder="Description"
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button onClick={handleSaveEdit} className="text-green-600 hover:text-green-700 p-1 rounded">
                    <Icon name="Check" size={16} />
                  </button>
                  <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded">
                    <Icon name="X" size={16} />
                  </button>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="AtSign" size={14} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item?.domain}</p>
                    {item?.description && <p className="text-xs text-gray-500 truncate">{item?.description}</p>}
                  </div>
                  <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-blue-600 p-1 rounded transition-colors">
                    <Icon name="Pencil" size={15} />
                  </button>
                  <button onClick={() => handleDelete(item?.id, item?.domain)} className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors">
                    <Icon name="Trash2" size={15} />
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ─── Fake User Examples Section ──────────────────────────────────────────────

const FAKE_EXAMPLES_KEY = 'admin_fake_user_examples';

const defaultExamples = [
  { id: '1', name: 'asdfghjkl qwerty', username: 'xkqzjwp123', email: 'xkqzjwp@mailinator.com', reason: 'Random keyboard mash name + disposable email' },
  { id: '2', name: '123 456', username: 'bot_99182', email: 'a7f3k9m2@tempmail.com', reason: 'Numeric name + bot username + disposable email' },
  { id: '3', name: 'Test User', username: 'testuser001', email: 'test@guerrillamail.com', reason: 'Generic test name + disposable email' },
  { id: '4', name: 'aaa bbb', username: 'aaabbb', email: 'aaabbb@yopmail.com', reason: 'Repeated character name + throwaway email' },
];

const FakeUserExamples = ({ userProfile }) => {
  const [examples, setExamples] = useState(() => {
    try {
      const stored = localStorage.getItem(FAKE_EXAMPLES_KEY);
      return stored ? JSON.parse(stored) : defaultExamples;
    } catch { return defaultExamples; }
  });
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', username: '', email: '', reason: '' });
  const [success, setSuccess] = useState('');

  const persist = (data) => {
    setExamples(data);
    localStorage.setItem(FAKE_EXAMPLES_KEY, JSON.stringify(data));
  };

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleAdd = () => {
    if (!form?.name && !form?.email) return;
    const newItem = { ...form, id: Date.now()?.toString() };
    persist([...examples, newItem]);
    setForm({ name: '', username: '', email: '', reason: '' });
    setShowForm(false);
    showSuccess('Example added');
  };

  const handleEdit = (item) => {
    setEditItem(item?.id);
    setForm({ name: item?.name, username: item?.username, email: item?.email, reason: item?.reason });
    setShowForm(true);
  };

  const handleSaveEdit = () => {
    persist(examples?.map(e => e?.id === editItem ? { ...form, id: editItem } : e));
    setEditItem(null);
    setForm({ name: '', username: '', email: '', reason: '' });
    setShowForm(false);
    showSuccess('Example updated');
  };

  const handleDelete = (id) => {
    if (!window.confirm('Remove this fake user example?')) return;
    persist(examples?.filter(e => e?.id !== id));
    showSuccess('Example removed');
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditItem(null);
    setForm({ name: '', username: '', email: '', reason: '' });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
          <Icon name="UserX" size={18} className="text-red-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Fake User Examples</h3>
          <p className="text-xs text-gray-500">Reference examples the AI uses to identify suspicious accounts</p>
        </div>
        <span className="ml-auto bg-red-50 text-red-700 text-xs font-medium px-2.5 py-1 rounded-full border border-red-200">
          {examples?.length} examples
        </span>
      </div>
      {success && (
        <div className="mx-6 mt-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs">{success}</div>
      )}
      {/* Add / Edit form */}
      {showForm && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {editItem ? 'Edit Example' : 'Add Fake User Example'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            <input value={form?.name} onChange={e => setForm(f => ({ ...f, name: e?.target?.value }))} placeholder="Full Name (e.g. asdfgh qwerty)" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input value={form?.username} onChange={e => setForm(f => ({ ...f, username: e?.target?.value }))} placeholder="Username (e.g. bot_99182)" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input value={form?.email} onChange={e => setForm(f => ({ ...f, email: e?.target?.value }))} placeholder="Email (e.g. xyz@mailinator.com)" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input value={form?.reason} onChange={e => setForm(f => ({ ...f, reason: e?.target?.value }))} placeholder="Reason / Notes" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex gap-2">
            <Button onClick={editItem ? handleSaveEdit : handleAdd}>
              <Icon name="Check" size={14} className="mr-1" /> {editItem ? 'Save Changes' : 'Add Example'}
            </Button>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          </div>
        </div>
      )}
      {!showForm && (
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
          <Button onClick={() => setShowForm(true)} variant="outline" className="text-sm">
            <Icon name="Plus" size={14} className="mr-1" /> Add Example
          </Button>
        </div>
      )}
      {/* Examples list */}
      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {examples?.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No examples added yet</div>
        ) : (
          examples?.map((item) => (
            <div key={item?.id} className="px-6 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon name="AlertTriangle" size={14} className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {item?.name && <span className="text-sm font-medium text-gray-900">{item?.name}</span>}
                  {item?.username && <span className="text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">@{item?.username}</span>}
                  {item?.email && <span className="text-xs text-blue-600 font-mono">{item?.email}</span>}
                </div>
                {item?.reason && <p className="text-xs text-gray-400 mt-0.5">{item?.reason}</p>}
              </div>
              <button onClick={() => handleEdit(item)} className="text-gray-400 hover:text-blue-600 p-1 rounded transition-colors flex-shrink-0">
                <Icon name="Pencil" size={15} />
              </button>
              <button onClick={() => handleDelete(item?.id)} className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors flex-shrink-0">
                <Icon name="Trash2" size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ─── Trusted Users Section ────────────────────────────────────────────────────

const TrustedUsers = ({ userProfile }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [success, setSuccess] = useState('');
  const [noteModal, setNoteModal] = useState(null); // { user, note }

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase?.from('user_profiles')?.select('id, full_name, email, username, role, is_trusted, trusted_note, ai_flagged, ai_flag_label')?.order('full_name', { ascending: true });
    setUsers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleToggleTrust = async (user) => {
    const newTrust = !user?.is_trusted;
    await supabase?.from('user_profiles')?.update({
      is_trusted: newTrust,
      trusted_note: newTrust ? (user?.trusted_note || null) : null,
      updated_at: new Date()?.toISOString(),
    })?.eq('id', user?.id);
    await logAdminAction({
      actionType: AUDIT_ACTIONS?.USER_ROLE_CHANGED || 'USER_UPDATED',
      actorId: userProfile?.id,
      actorName: userProfile?.full_name,
      actorRole: userProfile?.role,
      targetId: user?.id,
      targetType: 'user',
      targetName: user?.full_name || user?.email,
      description: `${newTrust ? 'Marked' : 'Unmarked'} user as trusted: ${user?.full_name || user?.email}`,
    });
    loadUsers();
    showSuccess(`User ${newTrust ? 'marked as trusted' : 'trust removed'}`);
  };

  const handleSaveNote = async () => {
    if (!noteModal) return;
    await supabase?.from('user_profiles')?.update({
      trusted_note: noteModal?.note?.trim() || null,
      updated_at: new Date()?.toISOString(),
    })?.eq('id', noteModal?.user?.id);
    setNoteModal(null);
    loadUsers();
    showSuccess('Note saved');
  };

  const filtered = users?.filter(u =>
    !search ||
    u?.full_name?.toLowerCase()?.includes(search?.toLowerCase()) ||
    u?.email?.toLowerCase()?.includes(search?.toLowerCase()) ||
    u?.username?.toLowerCase()?.includes(search?.toLowerCase())
  );

  const trustedCount = users?.filter(u => u?.is_trusted)?.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
          <Icon name="ShieldCheck" size={18} className="text-blue-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Trusted Users</h3>
          <p className="text-xs text-gray-500">Users always skipped by the AI scanner (e.g. test accounts)</p>
        </div>
        <span className="ml-auto bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full border border-blue-200">
          {trustedCount} trusted
        </span>
      </div>
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e?.target?.value)}
          placeholder="Search users by name, email, or username..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>
      {success && (
        <div className="mx-6 mt-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs">{success}</div>
      )}
      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="Loader2" size={20} className="animate-spin text-gray-400" />
          </div>
        ) : filtered?.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No users found</div>
        ) : (
          filtered?.map((user) => (
            <div key={user?.id} className={`px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${user?.is_trusted ? 'bg-blue-50/30' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${user?.is_trusted ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                {user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900 truncate">{user?.full_name || '(no name)'}</span>
                  {user?.username && <span className="text-xs text-gray-400 font-mono">@{user?.username}</span>}
                  {user?.is_trusted && (
                    <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      <Icon name="ShieldCheck" size={11} /> Trusted
                    </span>
                  )}
                  {user?.ai_flagged && !user?.is_trusted && (
                    <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                      <Icon name="AlertTriangle" size={11} /> {user?.ai_flag_label || 'Flagged'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                {user?.trusted_note && <p className="text-xs text-blue-600 italic truncate mt-0.5">Note: {user?.trusted_note}</p>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {user?.is_trusted && (
                  <button
                    onClick={() => setNoteModal({ user, note: user?.trusted_note || '' })}
                    className="text-gray-400 hover:text-blue-600 p-1 rounded transition-colors"
                    title="Edit note"
                  >
                    <Icon name="FileText" size={15} />
                  </button>
                )}
                <button
                  onClick={() => handleToggleTrust(user)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    user?.is_trusted
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
                  }`}
                >
                  <Icon name={user?.is_trusted ? 'ShieldOff' : 'ShieldCheck'} size={13} />
                  {user?.is_trusted ? 'Remove Trust' : 'Mark Trusted'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Note modal */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h4 className="text-base font-semibold text-gray-900 mb-1">Trusted User Note</h4>
            <p className="text-xs text-gray-500 mb-3">{noteModal?.user?.full_name || noteModal?.user?.email}</p>
            <textarea
              value={noteModal?.note}
              onChange={e => setNoteModal(n => ({ ...n, note: e?.target?.value }))}
              placeholder="e.g. Internal test account — do not flag"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <div className="flex gap-2 mt-3">
              <Button onClick={handleSaveNote}>Save Note</Button>
              <Button variant="outline" onClick={() => setNoteModal(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Export ──────────────────────────────────────────────────────────────

const AISecuritySettings = () => {
  const { userProfile } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <Icon name="ShieldAlert" size={20} className="text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">AI Security Settings</h2>
          <p className="text-sm text-gray-500">Configure domain allow list, fake user examples, and trusted accounts for the AI scanner</p>
        </div>
      </div>

      <DomainAllowList userProfile={userProfile} />
      <FakeUserExamples userProfile={userProfile} />
      <TrustedUsers userProfile={userProfile} />
    </div>
  );
};

export default AISecuritySettings;
