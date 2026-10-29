import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import TrackingMap from './components/TrackingMap';
import TripStatusCard from './components/TripStatusCard';
import DriverInfoCard from './components/DriverInfoCard';
import TripHistoryList from './components/TripHistoryList';
import NotificationPanel from './components/NotificationPanel';
import EmergencyContactModal from './components/EmergencyContactModal';
import DriverContactModal from './components/DriverContactModal';
import CancelBookingModal from './components/CancelBookingModal';
import { useAuth } from '../../contexts/AuthContext';
import tripTrackingService from '../../services/tripTrackingService';

const LiveTracking = () => {
  const navigate = useNavigate();
  const { user, loading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('current');
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isDriverContactModalOpen, setIsDriverContactModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [tripHistory, setTripHistory] = useState([]);
  const [tripProgress, setTripProgress] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth/login');
    }
  }, [loading, isAuthenticated, navigate]);

  // Load trip data
  const loadTripData = async () => {
    if (!isAuthenticated || !user?.id) return;

    try {
      setDataLoading(true);

      // Load current trip, trip history, and notifications in parallel
      const [currentTripData, historyData, notificationData] = await Promise.all([
        tripTrackingService?.getCurrentTrip(user?.id),
        tripTrackingService?.getTripHistory(user?.id, 10),
        tripTrackingService?.getNotifications(user?.id)
      ]);

      setCurrentTrip(currentTripData);
      setTripHistory(historyData);
      setNotifications(notificationData);

      // If there's an active trip, calculate progress
      if (currentTripData) {
        const progress = tripTrackingService?.simulateTripProgress(currentTripData);
        setTripProgress(progress);
      }
    } catch (error) {
      console.error('Error loading trip data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  // Load data on mount and when user changes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadTripData();
    }
  }, [isAuthenticated, user?.id]);

  // Update trip progress periodically for active trips
  useEffect(() => {
    let interval;
    if (currentTrip && currentTrip?.status === 'in_progress') {
      interval = setInterval(() => {
        const progress = tripTrackingService?.simulateTripProgress(currentTrip);
        setTripProgress(progress);
      }, 30000); // Update every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentTrip]);

  // Enhanced current trip data with progress
  const enhancedCurrentTrip = currentTrip ? {
    id: currentTrip?.booking_code || currentTrip?.id?.substring(0, 8)?.toUpperCase(),
    status: currentTrip?.status === 'confirmed' ? 'confirmed' : 
            currentTrip?.status === 'in_progress' ? 'en_route' : currentTrip?.status,
    pickup: currentTrip?.pickup,
    destination: currentTrip?.destination,
    bookingTime: new Date(currentTrip.pickup_date)?.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    }),
    estimatedDuration: '45 minutes',
    fare: parseFloat(currentTrip?.total_cost || 0)?.toFixed(2),
    // Add progress data
    ...tripProgress
  } : null;

  // Enhanced driver data
  const driverData = currentTrip?.driver ? {
    name: currentTrip?.driver?.name,
    photo: currentTrip?.driver?.photo,
    photoAlt: currentTrip?.driver?.photoAlt,
    rating: currentTrip?.driver?.rating,
    totalTrips: currentTrip?.driver?.totalTrips,
    experience: Math.floor(currentTrip?.driver?.totalTrips / 150) + 1, // Rough experience calculation
    onTimeRate: 98,
    languages: 3,
    phone: currentTrip?.driver?.phone,
    licenseNumber: currentTrip?.driver?.licenseNumber
  } : null;

  // Enhanced vehicle data
  const vehicleData = currentTrip?.vehicle ? {
    make: currentTrip?.vehicle?.make || 'Toyota',
    model: currentTrip?.vehicle?.name || 'Hiace Grandia',
    color: currentTrip?.vehicle?.color || 'White',
    plateNumber: currentTrip?.vehicle?.plate_number || 'ABC 1234',
    capacity: currentTrip?.vehicle?.capacity || 14,
    year: currentTrip?.vehicle?.year || 2023,
    features: currentTrip?.vehicle?.features || ['Air Conditioning', 'WiFi', 'USB Charging', 'Safety Belt']
  } : null;

  const handleContactDriver = () => {
    setIsDriverContactModalOpen(true);
  };

  const handleEmergencyCall = () => {
    setIsEmergencyModalOpen(true);
  };

  const handleCancelBooking = () => {
    setIsCancelModalOpen(true);
  };

  const handleBookingCancelled = (cancelledBooking) => {
    // Refresh trip data after cancellation
    loadTripData();
    
    // Show success notification
    setNotifications(prev => [{
      id: Date.now()?.toString(),
      title: 'Booking Cancelled',
      message: `Your booking has been cancelled successfully. ${cancelledBooking?.refundEligible ? 'Refund will be processed.' : ''}`,
      type: 'success',
      read: false,
      timestamp: new Date()?.toISOString()
    }, ...prev]);
  };

  const handleShareTrip = () => {
    if (navigator.share && enhancedCurrentTrip) {
      navigator.share({
        title: 'My GoShuttle Trip',
        text: `I'm traveling from ${enhancedCurrentTrip?.pickup} to ${enhancedCurrentTrip?.destination}. ETA: ${enhancedCurrentTrip?.eta}`,
        url: window.location?.href
      });
    }
  };

  const handleMessageDriver = () => {
    setIsDriverContactModalOpen(true);
  };

  const handleViewTrip = (tripId) => {
    navigate(`/booking-lookup-portal?id=${tripId}`);
  };

  const handleRebookTrip = (trip) => {
    // Navigate to booking portal with prefilled data
    const bookingData = {
      route: {
        from: trip?.from || trip?.pickup,
        to: trip?.to || trip?.destination
      },
      dateTime: {
        date: new Date()?.toISOString()?.split('T')?.[0],
        time: new Date(trip.pickupDate || trip.pickup_date)?.toLocaleTimeString('en-US', { 
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        })
      },
      passengerCount: trip?.passengerCount || trip?.passenger_count || 1
    };
    
    localStorage.setItem('rebookingData', JSON.stringify(bookingData));
    navigate('/smart-booking-portal');
  };

  const handleMarkAsRead = (notificationId) => {
    setNotifications((prev) =>
      prev?.map((notification) =>
        notification?.id === notificationId ?
        { ...notification, read: true } :
        notification
      )
    );
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const tabs = [
    { id: 'current', label: 'Current Trip', icon: 'Navigation' },
    { id: 'history', label: 'Trip History', icon: 'History' },
    { id: 'notifications', label: 'Notifications', icon: 'Bell' }
  ];

  const unreadCount = notifications?.filter((n) => !n?.read)?.length;

  // Show loading state
  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-16 flex items-center justify-center" style={{minHeight: 'calc(100vh - 4rem)'}}>
          <div className="text-center">
            <Icon name="Loader2" className="animate-spin mx-auto mb-4" size={24} />
            <p className="text-gray-600">Loading trip information...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt for non-authenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-16 flex items-center justify-center" style={{minHeight: 'calc(100vh - 4rem)'}}>
          <div className="text-center">
            <Icon name="Lock" size={48} className="text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Please Sign In</h1>
            <p className="text-gray-600 mb-4">You need to be logged in to track your trips</p>
            <Button onClick={() => navigate('/auth/login')}>
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Live Tracking - GoShuttle Pro</title>
        <meta name="description" content="Track your GoShuttle journey in real-time with live GPS tracking, driver communication, and trip updates." />
      </Helmet>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="pt-16">
          {/* Hero Section */}
          <section style={{background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #1d4ed8 100%)'}} className="text-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                  Live Trip Tracking
                </h1>
                <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                  Monitor your journey in real-time with GPS tracking, driver communication, and instant updates
                </p>
              </div>
            </div>
          </section>

          {/* Tab Navigation */}
          <section className="bg-white border-b border-gray-200 sticky top-16 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex space-x-8 overflow-x-auto">
                {tabs?.map((tab) =>
                <button
                  key={tab?.id}
                  onClick={() => setActiveTab(tab?.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab?.id ?
                  'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
                  }>

                    <Icon name={tab?.icon} size={20} />
                    <span>{tab?.label}</span>
                    {tab?.id === 'notifications' && unreadCount > 0 &&
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                        {unreadCount}
                      </span>
                  }
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Content Sections */}
          <section className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {activeTab === 'current' && (
                <div className="space-y-8">
                  {enhancedCurrentTrip ? (
                    <>
                      {/* Current Trip Overview */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                          <TrackingMap currentTrip={enhancedCurrentTrip} />
                        </div>
                        <div className="space-y-6">
                          <TripStatusCard
                            currentTrip={enhancedCurrentTrip}
                            onContactDriver={handleContactDriver}
                            onEmergencyCall={handleEmergencyCall}
                            onShareTrip={handleShareTrip}
                            onCancelBooking={handleCancelBooking} />

                          {driverData && (
                            <DriverInfoCard
                              driver={driverData}
                              vehicle={vehicleData}
                              onCallDriver={handleContactDriver}
                              onMessageDriver={handleMessageDriver} />
                          )}
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="bg-white rounded-xl shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <Button
                            variant="outline"
                            onClick={handleShareTrip}
                            iconName="Share2"
                            iconPosition="left"
                            className="justify-center">
                            Share Trip
                          </Button>
                          {driverData && (
                            <Button
                              variant="outline"
                              onClick={handleContactDriver}
                              iconName="MessageCircle"
                              iconPosition="left"
                              className="justify-center">
                              Contact Driver
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => navigate('/support-center')}
                            iconName="Phone"
                            iconPosition="left"
                            className="justify-center">
                            Get Support
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleCancelBooking}
                            iconName="X"
                            iconPosition="left"
                            className="justify-center">
                            Cancel Trip
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleEmergencyCall}
                            iconName="AlertTriangle"
                            iconPosition="left"
                            className="justify-center">
                            Emergency
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <Icon name="Navigation" size={64} className="text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Trip</h3>
                      <p className="text-gray-600 mb-6">You don't have any active trips to track right now.</p>
                      <Button onClick={() => navigate('/smart-booking-portal')}>
                        <Icon name="Plus" size={16} className="mr-2" />
                        Book a Trip
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <TripHistoryList
                  trips={tripHistory}
                  onViewTrip={handleViewTrip}
                  onRebookTrip={handleRebookTrip} />
              )}

              {activeTab === 'notifications' && (
                <NotificationPanel
                  notifications={notifications}
                  onMarkAsRead={handleMarkAsRead}
                  onClearAll={handleClearAllNotifications} />
              )}
            </div>
          </section>

          {/* Modals */}
          <EmergencyContactModal
            isOpen={isEmergencyModalOpen}
            onClose={() => setIsEmergencyModalOpen(false)}
            currentTrip={enhancedCurrentTrip} />

          <DriverContactModal
            isOpen={isDriverContactModalOpen}
            onClose={() => setIsDriverContactModalOpen(false)}
            currentTrip={enhancedCurrentTrip}
            driverData={driverData} />

          <CancelBookingModal
            isOpen={isCancelModalOpen}
            onClose={() => setIsCancelModalOpen(false)}
            currentTrip={enhancedCurrentTrip}
            onBookingCancelled={handleBookingCancelled} />

          {/* Footer */}
          <footer className="bg-gray-900 text-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="md:col-span-2">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-operational-gradient rounded-lg flex items-center justify-center">
                      <Icon name="Zap" size={24} color="white" strokeWidth={2.5} />
                    </div>
                    <div>
                      <span className="text-xl font-bold">GoShuttle</span>
                      <span className="text-sm font-medium text-gray-300 ml-1">Pro</span>
                    </div>
                  </div>
                  <p className="text-gray-300 mb-4">
                    Premium shuttle and van booking platform transforming ground transportation into a seamless, technology-driven experience.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">Support</h4>
                  <ul className="space-y-2 text-gray-300">
                    <li>24/7 Customer Service</li>
                    <li>Emergency Hotline</li>
                    <li>Driver Support</li>
                    <li>Technical Help</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">Safety</h4>
                  <ul className="space-y-2 text-gray-300">
                    <li>Real-time Tracking</li>
                    <li>Verified Drivers</li>
                    <li>Insurance Coverage</li>
                    <li>Emergency Protocols</li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-gray-800 pt-8 mt-8 text-center text-gray-400">
                <p>&copy; {new Date()?.getFullYear()} GoShuttle Pro. All rights reserved.</p>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
};

export default LiveTracking;