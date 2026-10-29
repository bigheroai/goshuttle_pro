import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import OpsBookingTable from './components/OpsBookingTable';

const REFRESH_INTERVAL = 30000; // 30 seconds

const StatCard = ({ icon, label, value, color, subLabel }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 flex items-start gap-4">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon name={icon} size={18} className="text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      {subLabel && <p className="text-xs text-gray-400 mt-0.5">{subLabel}</p>}
    </div>
  </div>
);

const OpsDashboard = () => {
  const { isAdmin, loading: authLoading, userProfile } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadBookings = useCallback(async () => {
    try {
      const { data, error } = await supabase?.from('bookings')?.select(`
          id,
          booking_code,
          status,
          pickup_location,
          dropoff_location,
          pickup_date,
          pickup_time,
          passenger_count,
          total_cost,
          is_guest_booking,
          guest_email,
          guest_name,
          primary_passenger_first_name,
          primary_passenger_last_name,
          primary_passenger_email,
          is_flagged,
          flag_reason,
          flag_note,
          flagged_at,
          ops_intervention_note,
          ops_intervened_at,
          created_at,
          updated_at,
          user_profiles!bookings_user_id_fkey (
            full_name,
            email
          )
        `)?.order('created_at', { ascending: false })?.limit(200);

      if (error) throw error;
      setBookings(data || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error loading ops bookings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadBookings();
    }
  }, [authLoading, isAdmin, loadBookings]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !isAdmin) return;
    const interval = setInterval(() => {
      loadBookings();
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [autoRefresh, isAdmin, loadBookings]);

  // Real-time subscription
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase?.channel('ops-bookings-realtime')?.on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        loadBookings();
      })?.subscribe();
    return () => supabase?.removeChannel(channel);
  }, [isAdmin, loadBookings]);

  if (!authLoading && userProfile && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon name="Lock" size={48} className="text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access the Ops Dashboard.</p>
          <Button onClick={() => window.location.href = '/'}>Go Home</Button>
        </div>
      </div>
    );
  }

  if (authLoading || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Icon name="Loader2" size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  // Compute stats
  const total = bookings?.length;
  const pending = bookings?.filter(b => b?.status === 'pending')?.length;
  const inProgress = bookings?.filter(b => b?.status === 'in_progress' || b?.status === 'confirmed')?.length;
  const flagged = bookings?.filter(b => b?.is_flagged)?.length;
  const completed = bookings?.filter(b => b?.status === 'completed')?.length;
  const cancelled = bookings?.filter(b => b?.status === 'cancelled')?.length;

  return (
    <>
      <Helmet>
        <title>Ops Dashboard - GoShuttle Pro</title>
        <meta name="description" content="Internal operations dashboard for support and admin team" />
      </Helmet>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="pt-20 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <Icon name="Activity" size={16} className="text-white" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Ops Dashboard</h1>
                  {flagged > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full border border-orange-200">
                      <Icon name="AlertTriangle" size={11} />
                      {flagged} flagged
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">Real-time booking monitoring &amp; intervention</p>
              </div>
              <div className="flex items-center gap-3">
                {lastRefreshed && (
                  <span className="text-xs text-gray-400">
                    Updated {lastRefreshed?.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
                <button
                  onClick={() => setAutoRefresh(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    autoRefresh
                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' :'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                  {autoRefresh ? 'Live' : 'Paused'}
                </button>
                <button
                  onClick={() => { setLoading(true); loadBookings(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Icon name="RefreshCw" size={13} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <StatCard icon="Calendar" label="Total" value={total} color="bg-gray-500" subLabel="" />
              <StatCard icon="Clock" label="Pending" value={pending} color="bg-yellow-500" subLabel="" />
              <StatCard icon="Zap" label="Active" value={inProgress} color="bg-blue-500" subLabel="" />
              <StatCard icon="CheckCircle" label="Completed" value={completed} color="bg-green-500" subLabel="" />
              <StatCard icon="XCircle" label="Cancelled" value={cancelled} color="bg-red-500" subLabel="" />
              <StatCard icon="Flag" label="Flagged" value={flagged} color="bg-orange-500" subLabel={flagged > 0 ? 'Needs attention' : 'All clear'} />
            </div>

            {/* Flagged Alert Banner */}
            {flagged > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <Icon name="AlertTriangle" size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-orange-800">
                    {flagged} booking{flagged > 1 ? 's' : ''} flagged for review
                  </p>
                  <p className="text-xs text-orange-600 mt-0.5">
                    Use the filter below to view flagged bookings and take action.
                  </p>
                </div>
              </div>
            )}

            {/* Booking Table */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Icon name="List" size={16} className="text-gray-500" />
                  All Bookings
                </h2>
                <a
                  href="/admin-dashboard"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Icon name="ExternalLink" size={12} />
                  Full Admin Dashboard
                </a>
              </div>
              <OpsBookingTable
                bookings={bookings}
                onUpdate={loadBookings}
                loading={loading}
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default OpsDashboard;
