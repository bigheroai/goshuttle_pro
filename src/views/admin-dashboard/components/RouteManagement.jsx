import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { MapPin, Plus, Pencil, Trash2, Star, StarOff, ToggleLeft, ToggleRight, X, Check } from 'lucide-react';

const LOCATION_OPTIONS = [
  'Quezon City', 'Makati', 'Tagaytay', 'Calamba', 'Sto. Tomas Batangas', 'Alabang', 'Cavite',
  'Manila', 'Pasig', 'Taguig', 'Mandaluyong', 'Pasay', 'Parañaque', 'Las Piñas',
  'Muntinlupa', 'Marikina', 'Valenzuela', 'Malabon', 'Navotas', 'San Juan',
  'Batangas City', 'Lipa', 'Lucena', 'Antipolo', 'San Pedro', 'Biñan', 'Santa Rosa'
];

const EMPTY_FORM = {
  from_location: '',
  to_location: '',
  price: '',
  duration: '',
  description: '',
  tags: '',
  image_url: '',
  image_alt: '',
  is_popular: false,
  is_active: true,
  sort_order: 0
};

const RouteManagement = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      setError('');
      const { data, error: err } = await supabase?.from('routes')?.select('*')?.order('sort_order', { ascending: true })?.order('created_at', { ascending: false });

      if (err) throw err;
      setRoutes(data || []);
    } catch (err) {
      setError('Failed to load routes: ' + (err?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setEditingRoute(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const openEditForm = (route) => {
    setEditingRoute(route);
    setForm({
      from_location: route?.from_location || '',
      to_location: route?.to_location || '',
      price: route?.price?.toString() || '',
      duration: route?.duration || '',
      description: route?.description || '',
      tags: (route?.tags || [])?.join(', '),
      image_url: route?.image_url || '',
      image_alt: route?.image_alt || '',
      is_popular: route?.is_popular || false,
      is_active: route?.is_active !== false,
      sort_order: route?.sort_order || 0
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRoute(null);
    setForm(EMPTY_FORM);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e?.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form?.from_location || !form?.to_location) {
      setError('From and To locations are required.');
      return;
    }
    if (form?.from_location === form?.to_location) {
      setError('From and To locations must be different.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        from_location: form?.from_location?.trim(),
        to_location: form?.to_location?.trim(),
        price: parseInt(form?.price) || 0,
        duration: form?.duration?.trim(),
        description: form?.description?.trim(),
        tags: form?.tags ? form?.tags?.split(',')?.map(t => t?.trim())?.filter(Boolean) : [],
        image_url: form?.image_url?.trim(),
        image_alt: form?.image_alt?.trim(),
        is_popular: form?.is_popular,
        is_active: form?.is_active,
        sort_order: parseInt(form?.sort_order) || 0
      };

      if (editingRoute) {
        const { error: err } = await supabase?.from('routes')?.update(payload)?.eq('id', editingRoute?.id);
        if (err) throw err;
        setSuccess('Route updated successfully.');
      } else {
        const { error: err } = await supabase?.from('routes')?.insert(payload);
        if (err) throw err;
        setSuccess('Route added successfully.');
      }

      await loadRoutes();
      closeForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save route: ' + (err?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const togglePopular = async (route) => {
    try {
      const { error: err } = await supabase?.from('routes')?.update({ is_popular: !route?.is_popular })?.eq('id', route?.id);
      if (err) throw err;
      setRoutes(prev => prev?.map(r => r?.id === route?.id ? { ...r, is_popular: !r?.is_popular } : r));
    } catch (err) {
      setError('Failed to update route: ' + (err?.message || 'Unknown error'));
    }
  };

  const toggleActive = async (route) => {
    try {
      const { error: err } = await supabase?.from('routes')?.update({ is_active: !route?.is_active })?.eq('id', route?.id);
      if (err) throw err;
      setRoutes(prev => prev?.map(r => r?.id === route?.id ? { ...r, is_active: !r?.is_active } : r));
    } catch (err) {
      setError('Failed to update route: ' + (err?.message || 'Unknown error'));
    }
  };

  const deleteRoute = async (id) => {
    try {
      const { error: err } = await supabase?.from('routes')?.delete()?.eq('id', id);
      if (err) throw err;
      setRoutes(prev => prev?.filter(r => r?.id !== id));
      setDeleteConfirm(null);
      setSuccess('Route deleted.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete route: ' + (err?.message || 'Unknown error'));
    }
  };

  const filteredRoutes = routes?.filter(r => {
    if (filter === 'popular') return r?.is_popular;
    if (filter === 'active') return r?.is_active;
    if (filter === 'inactive') return !r?.is_active;
    return true;
  });

  const popularCount = routes?.filter(r => r?.is_popular)?.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Route Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            {routes?.length} total routes · {popularCount} marked as popular
          </p>
        </div>
        <Button
          onClick={openAddForm}
          className="bg-primary text-white flex items-center gap-2"
        >
          <Plus size={16} />
          Add Route
        </Button>
      </div>
      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <Icon name="AlertCircle" size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <Check size={18} className="text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}
      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'All Routes' },
          { key: 'popular', label: 'Most Popular' },
          { key: 'active', label: 'Active' },
          { key: 'inactive', label: 'Inactive' }
        ]?.map(tab => (
          <button
            key={tab?.key}
            onClick={() => setFilter(tab?.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab?.key
                ? 'bg-primary text-white' :'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab?.label}
          </button>
        ))}
      </div>
      {/* Route Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingRoute ? 'Edit Route' : 'Add New Route'}
              </h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
              )}

              {/* From / To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Location *</label>
                  <select
                    name="from_location"
                    value={form?.from_location}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    <option value="">Select origin</option>
                    {LOCATION_OPTIONS?.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Location *</label>
                  <select
                    name="to_location"
                    value={form?.to_location}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    <option value="">Select destination</option>
                    {LOCATION_OPTIONS?.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price / Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₱)</label>
                  <input
                    type="number"
                    name="price"
                    value={form?.price}
                    onChange={handleChange}
                    min="0"
                    placeholder="e.g. 350"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <input
                    type="text"
                    name="duration"
                    value={form?.duration}
                    onChange={handleChange}
                    placeholder="e.g. 1h 30m"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  name="description"
                  value={form?.description}
                  onChange={handleChange}
                  placeholder="e.g. Express city shuttle route"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  name="tags"
                  value={form?.tags}
                  onChange={handleChange}
                  placeholder="e.g. Express Service, Business Route, Daily Commute"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Image URL / Alt */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <input
                    type="url"
                    name="image_url"
                    value={form?.image_url}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image Alt Text</label>
                  <input
                    type="text"
                    name="image_alt"
                    value={form?.image_alt}
                    onChange={handleChange}
                    placeholder="Describe the image"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <input
                  type="number"
                  name="sort_order"
                  value={form?.sort_order}
                  onChange={handleChange}
                  min="0"
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Toggles */}
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_popular"
                    checked={form?.is_popular}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Star size={15} className="text-amber-500" />
                    Mark as Most Popular
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form?.is_active}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">Active (visible to users)</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-primary text-white flex-1"
                >
                  {saving ? 'Saving...' : editingRoute ? 'Update Route' : 'Add Route'}
                </Button>
                <Button
                  type="button"
                  onClick={closeForm}
                  className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Routes Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Icon name="Loader2" size={28} className="animate-spin text-primary mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading routes...</p>
        </div>
      ) : filteredRoutes?.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MapPin size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No routes found</p>
          <p className="text-gray-400 text-sm mt-1">
            {filter !== 'all' ? 'Try a different filter or ' : ''}
            <button onClick={openAddForm} className="text-primary hover:underline">add a new route</button>
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Route</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Price</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Duration</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Popular</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRoutes?.map(route => (
                  <tr key={route?.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-primary flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {route?.from_location} → {route?.to_location}
                          </p>
                          {route?.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{route?.description}</p>
                          )}
                          {route?.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {route?.tags?.slice(0, 3)?.map((tag, i) => (
                                <span key={i} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-semibold text-gray-900">
                      ₱{route?.price?.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-gray-600">{route?.duration}</td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => togglePopular(route)}
                        title={route?.is_popular ? 'Remove from popular' : 'Mark as popular'}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                          route?.is_popular
                            ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' :'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {route?.is_popular ? <Star size={15} /> : <StarOff size={15} />}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => toggleActive(route)}
                        title={route?.is_active ? 'Deactivate' : 'Activate'}
                        className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
                      >
                        {route?.is_active ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <ToggleRight size={18} />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-400">
                            <ToggleLeft size={18} />
                            Inactive
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditForm(route)}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Edit route"
                        >
                          <Pencil size={15} />
                        </button>
                        {deleteConfirm === route?.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => deleteRoute(route?.id)}
                              className="px-2 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(route?.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete route"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteManagement;
