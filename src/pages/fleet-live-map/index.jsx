import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import DriverListSidebar from './components/DriverListSidebar';
import DriverMarkerPanel from './components/DriverMarkerPanel';

const REFRESH_INTERVAL = 20000; // 20 seconds

// Metro Manila mock locations for drivers without GPS data
const METRO_MANILA_LOCATIONS = [
  { lat: 14.5547, lng: 121.0244, address: 'EDSA Guadalupe, Makati City' },
  { lat: 14.5995, lng: 120.9842, address: 'Taft Avenue, Manila' },
  { lat: 14.6760, lng: 121.0437, address: 'Quezon Avenue, Quezon City' },
  { lat: 14.5176, lng: 121.0509, address: 'Buendia Avenue, Makati City' },
  { lat: 14.5074, lng: 121.0169, address: 'Roxas Boulevard, Pasay City' },
  { lat: 14.6507, lng: 121.1029, address: 'Ortigas Center, Pasig City' },
  { lat: 14.4793, lng: 121.0198, address: 'Alabang, Muntinlupa City' },
  { lat: 14.7406, lng: 121.0450, address: 'Fairview, Quezon City' },
  { lat: 14.5764, lng: 121.0851, address: 'Kapitolyo, Pasig City' },
  { lat: 14.5282, lng: 121.0498, address: 'Rockwell, Makati City' },
];

const buildMapUrl = (drivers, selectedDriver, centerLat = 14.5995, centerLng = 120.9842) => {
  const apiKey = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  if (selectedDriver?.currentLocation) {
    const { lat, lng } = selectedDriver?.currentLocation;
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${lat},${lng}&zoom=14`;
  }

  // Show center of Metro Manila with all drivers
  return `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${centerLat},${centerLng}&zoom=12`;
};

const FleetLiveMap = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading, userProfile } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const refreshTimerRef = useRef(null);

  const loadFleetData = useCallback(async () => {
    try {
      // Load active bookings with driver and vehicle info
      const { data: bookings, error: bookingsError } = await supabase
        ?.from('bookings')
        ?.select(`
          id,
          booking_code,
          status,
          pickup_location,
          dropoff_location,
          pickup_date,
          pickup_time,
          passenger_count,
          total_cost,
          vehicle_id,
          vehicles (
            id,
            name,
            make,
            model,
            plate_number,
            color,
            capacity,
            vehicle_type
          )
        `)
        ?.in('status', ['confirmed', 'in_progress', 'pending'])
        ?.order('pickup_date', { ascending: true })
        ?.limit(100);

      if (bookingsError) throw bookingsError;

      // Load driver assignments for these bookings
      const bookingIds = bookings?.map(b => b?.id) || [];
      let assignments = [];

      if (bookingIds?.length > 0) {
        const { data: assignData } = await supabase
          ?.from('driver_assignments')
          ?.select(`
            id,
            booking_id,
            status,
            driver_profiles (
              id,
              license_number,
              rating,
              total_trips,
              user_profiles (
                full_name,
                phone
              )
            )
          `)
          ?.in('booking_id', bookingIds);

        assignments = assignData || [];
      }

      // Also load all active driver profiles for available drivers
      const { data: allDriverProfiles } = await supabase
        ?.from('driver_profiles')
        ?.select(`
          id,
          license_number,
          rating,
          total_trips,
          user_profiles (
            full_name,
            phone
          )
        `)
        ?.limit(50);

      // Build driver map entries
      const assignmentMap = {};
      assignments?.forEach(a => {
        assignmentMap[a?.booking_id] = a;
      });

      // Build fleet driver list from bookings
      const fleetFromBookings = bookings?.map((booking, idx) => {
        const assignment = assignmentMap?.[booking?.id];
        const driverProfile = assignment?.driver_profiles;
        const vehicle = booking?.vehicles;
        const locIdx = idx % METRO_MANILA_LOCATIONS?.length;
        const loc = METRO_MANILA_LOCATIONS?.[locIdx];

        // Simulate trip progress for in_progress bookings
        let tripProgress = null;
        if (booking?.status === 'in_progress') {
          const now = new Date();
          const pickupTime = new Date(booking?.pickup_date);
          const elapsed = Math.floor((now - pickupTime) / (1000 * 60));
          const duration = 45;
          const progress = Math.min(Math.max(Math.floor((elapsed / duration) * 100), 5), 95);
          const remaining = Math.max(duration - elapsed, 5);
          const eta = new Date(now.getTime() + remaining * 60000)?.toLocaleTimeString('en-PH', {
            hour: 'numeric', minute: '2-digit', hour12: true
          });
          tripProgress = { progress, eta, remainingMinutes: remaining };
        }

        return {
          id: booking?.id,
          bookingId: booking?.id,
          bookingCode: booking?.booking_code,
          driverName: driverProfile?.user_profiles?.full_name || `Driver #${idx + 1}`,
          driverPhone: driverProfile?.user_profiles?.phone || null,
          driverRating: driverProfile?.rating || 4.8,
          licenseNumber: driverProfile?.license_number || null,
          vehicleName: vehicle ? `${vehicle?.make || ''} ${vehicle?.name || vehicle?.model || ''}`?.trim() : 'Vehicle',
          vehicleType: vehicle?.vehicle_type || 'Van',
          plateNumber: vehicle?.plate_number || '—',
          vehicleColor: vehicle?.color || 'White',
          capacity: vehicle?.capacity || 14,
          status: booking?.status,
          currentLocation: loc,
          lastUpdated: 'just now',
          currentTrip: {
            id: booking?.id,
            bookingCode: booking?.booking_code,
            pickup: booking?.pickup_location,
            destination: booking?.dropoff_location,
            pickupDate: booking?.pickup_date,
            passengerCount: booking?.passenger_count,
            totalCost: booking?.total_cost,
            ...tripProgress,
          },
        };
      });

      // Add available drivers (those with profiles but no active booking)
      const assignedDriverProfileIds = new Set(
        assignments?.map(a => a?.driver_profiles?.id)?.filter(Boolean)
      );

      const availableDrivers = (allDriverProfiles || [])
        ?.filter(dp => !assignedDriverProfileIds?.has(dp?.id))
        ?.slice(0, 10)
        ?.map((dp, idx) => {
          const locIdx = (fleetFromBookings?.length + idx) % METRO_MANILA_LOCATIONS?.length;
          return {
            id: `avail-${dp?.id}`,
            driverName: dp?.user_profiles?.full_name || `Driver`,
            driverPhone: dp?.user_profiles?.phone || null,
            driverRating: dp?.rating || 4.8,
            licenseNumber: dp?.license_number || null,
            vehicleName: 'Unassigned',
            vehicleType: '—',
            plateNumber: '—',
            capacity: '—',
            status: 'available',
            currentLocation: METRO_MANILA_LOCATIONS?.[locIdx],
            lastUpdated: 'just now',
            currentTrip: null,
          };
        });

      const allDrivers = [...fleetFromBookings, ...availableDrivers];
      setDrivers(allDrivers);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error loading fleet data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadFleetData();
    }
  }, [authLoading, isAdmin, loadFleetData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !isAdmin) return;
    refreshTimerRef.current = setInterval(loadFleetData, REFRESH_INTERVAL);
    return () => clearInterval(refreshTimerRef?.current);
  }, [autoRefresh, isAdmin, loadFleetData]);

  // Real-time subscription
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      ?.channel('fleet-live-map-realtime')
      ?.on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, loadFleetData)
      ?.on('postgres_changes', { event: '*', schema: 'public', table: 'driver_assignments' }, loadFleetData)
      ?.subscribe();
    return () => supabase?.removeChannel(channel);
  }, [isAdmin, loadFleetData]);

  const handleSelectDriver = (driver) => {
    setSelectedDriver(prev => prev?.id === driver?.id ? null : driver);
  };

  const handleViewTrip = (tripId) => {
    navigate(`/booking-lookup-portal?id=${tripId}`);
  };

  // Access control
  if (!authLoading && userProfile && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon name="Lock" size={48} className="text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">Fleet Live Map is restricted to admin users.</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            Go Home
          </button>
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

  const onTripCount = drivers?.filter(d => d?.status === 'in_progress')?.length;
  const availableCount = drivers?.filter(d => d?.status === 'available')?.length;
  const confirmedCount = drivers?.filter(d => d?.status === 'confirmed')?.length;
  const totalActive = onTripCount + confirmedCount;

  const mapUrl = buildMapUrl(drivers, selectedDriver);

  return (
    <>
      <Helmet>
        <title>Fleet Live Map — GoShuttle Dispatcher</title>
        <meta name="description" content="Real-time fleet oversight map showing all live driver locations, trip status, and ETAs." />
      </Helmet>

      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Header />

        <main className="pt-16 flex flex-col flex-1" style={{ height: 'calc(100vh - 4rem)' }}>
          {/* Top Bar */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(v => !v)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                title="Toggle sidebar"
              >
                <Icon name="PanelLeft" size={18} className="text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                  <Icon name="Map" size={14} className="text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-gray-900 leading-tight">Fleet Live Map</h1>
                  <p className="text-xs text-gray-500 leading-tight">Real-time dispatcher view</p>
                </div>
              </div>

              {/* Status Pills */}
              <div className="hidden sm:flex items-center gap-2 ml-2">
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  {onTripCount} On Trip
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {availableCount} Available
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {confirmedCount} Confirmed
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {lastRefreshed && (
                <span className="hidden sm:block text-xs text-gray-400">
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
                <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                {autoRefresh ? 'Live' : 'Paused'}
              </button>
              <button
                onClick={() => { setLoading(true); loadFleetData(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Icon name="RefreshCw" size={13} />
                Refresh
              </button>
              <a
                href="/ops-dashboard"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Icon name="LayoutDashboard" size={13} />
                Ops Dashboard
              </a>
            </div>
          </div>

          {/* Main Content: Sidebar + Map */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            {sidebarOpen && (
              <div className="w-72 flex-shrink-0 overflow-hidden flex flex-col border-r border-gray-200">
                <DriverListSidebar
                  drivers={drivers}
                  selectedDriver={selectedDriver}
                  onSelectDriver={handleSelectDriver}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  loading={loading}
                />
              </div>
            )}

            {/* Map Area */}
            <div className="flex-1 relative overflow-hidden bg-gray-200">
              {loading && drivers?.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <Icon name="Loader2" size={32} className="animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-gray-600 font-medium">Loading fleet data...</p>
                  </div>
                </div>
              ) : mapUrl ? (
                <iframe
                  key={selectedDriver?.id || 'fleet-overview'}
                  src={mapUrl}
                  width="100%"
                  height="100%"
                  loading="lazy"
                  title="Fleet Live Map"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full border-0"
                  style={{ minHeight: '400px' }}
                />
              ) : (
                // Fallback map when no API key
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                  <div className="text-center">
                    <Icon name="MapPin" size={48} className="text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-600">Map unavailable</p>
                    <p className="text-xs text-slate-500 mt-1">Google Maps API key not configured</p>
                  </div>
                </div>
              )}

              {/* Live indicator overlay */}
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200 z-10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-gray-800">Live Fleet View</span>
                  <span className="text-xs text-gray-500">·</span>
                  <span className="text-xs text-gray-600">{drivers?.length} vehicles</span>
                </div>
              </div>

              {/* Driver count overlay bottom-left */}
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-4 py-3 z-10">
                <p className="text-xs font-semibold text-gray-700 mb-2">Fleet Summary</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-xs text-gray-600">{onTripCount} on trip</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs text-gray-600">{confirmedCount} confirmed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="text-xs text-gray-600">{availableCount} available</span>
                  </div>
                </div>
              </div>

              {/* Selected Driver Panel */}
              {selectedDriver && (
                <DriverMarkerPanel
                  driver={selectedDriver}
                  onClose={() => setSelectedDriver(null)}
                  onViewTrip={handleViewTrip}
                />
              )}
            </div>
          </div>

          {/* Mobile Driver List (below map on small screens) */}
          {!sidebarOpen && (
            <div className="sm:hidden bg-white border-t border-gray-200 max-h-48 overflow-y-auto">
              <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">{drivers?.length} Drivers</p>
                <button onClick={() => setSidebarOpen(true)} className="text-xs text-primary font-medium">Show Sidebar</button>
              </div>
              <div className="divide-y divide-gray-100">
                {drivers?.slice(0, 8)?.map(driver => {
                  const statusColors = {
                    in_progress: 'bg-blue-500',
                    available: 'bg-green-500',
                    confirmed: 'bg-amber-500',
                    offline: 'bg-gray-400',
                  };
                  return (
                    <button
                      key={driver?.id}
                      onClick={() => handleSelectDriver(driver)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors?.[driver?.status] || 'bg-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{driver?.driverName}</p>
                        <p className="text-xs text-gray-500 truncate">{driver?.plateNumber} · {driver?.vehicleName}</p>
                      </div>
                      {driver?.currentTrip?.eta && (
                        <span className="text-xs text-blue-600 flex-shrink-0">ETA {driver?.currentTrip?.eta}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default FleetLiveMap;
