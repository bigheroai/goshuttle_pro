import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import PlacesAutocomplete from '../../../components/ui/PlacesAutocomplete';
import routeService from '../../../services/routeService';

const HeroSection = ({ onRouteSelect }) => {
  const navigate = useNavigate();
  const [quickBooking, setQuickBooking] = useState({
    from: '',
    to: '',
    date: '',
    passengers: 1
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleQuickBookingChange = (field, value) => {
    setQuickBooking(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePlaceSelect = (field, placeData) => {
    const locationValue = placeData?.address || placeData?.name || '';
    setQuickBooking(prev => ({
      ...prev,
      [field]: locationValue
    }));
    setError('');
  };

  const handleQuickBook = async () => {
    if (!quickBooking?.from || !quickBooking?.to || !quickBooking?.date) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const pricingData = await routeService?.getRoutePricing(
        quickBooking?.from, 
        quickBooking?.to, 
        quickBooking?.passengers
      );

      localStorage.removeItem('bookingCurrentStep');
      localStorage.removeItem('bookingData');
      localStorage.removeItem('bookingConfirmed');

      const bookingData = {
        route: {
          from: quickBooking?.from,
          to: quickBooking?.to
        },
        dateTime: {
          date: quickBooking?.date,
          time: '09:00'
        },
        passengerCount: quickBooking?.passengers,
        estimatedPrice: pricingData?.estimatedPrice,
        availableVehicles: pricingData?.availableVehicles
      };

      sessionStorage.setItem('quickBookingData', JSON.stringify(bookingData));
      navigate('/smart-booking-portal');
    } catch (err) {
      console.error('Quick booking error:', err);
      setError('Unable to process booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePopularRouteClick = (route) => {
    setQuickBooking(prev => ({
      ...prev,
      from: route?.from,
      to: route?.to
    }));
    setError('');
    if (onRouteSelect) {
      onRouteSelect(route);
    }
  };

  const popularRoutes = [
    { from: "Quezon City", to: "Makati", price: "₱350", duration: "45m" },
    { from: "Alabang", to: "Tagaytay", price: "₱600", duration: "1h 30m" },
    { from: "Calamba", to: "Makati", price: "₱750", duration: "1h 45m" }
  ];

  return (
    <section
      className="relative overflow-hidden"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e293b 100%)',
        willChange: 'auto',
        contain: 'layout style'
      }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10" aria-hidden="true">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-blue-300 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-emerald-300 rounded-full blur-2xl"></div>
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-start" style={{ minHeight: '80vh' }}>
          {/* Left Content */}
          <div className="text-white space-y-8 relative z-10">
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium text-white">
                <Icon name="Zap" size={16} className="text-yellow-400" />
                <span>Premium Transportation Solutions</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-white">
                Your Journey,
                <span className="block text-blue-300">
                  Our Commitment
                </span>
              </h1>

              <p className="text-xl text-gray-200 leading-relaxed max-w-lg">
                Experience seamless ground transportation with real-time tracking, professional drivers, and guaranteed punctuality. From corporate travel to family adventures, we deliver journey confidence every time.
              </p>
            </div>

            {/* Key Features */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="w-10 h-10 bg-emerald-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="Shield" size={20} className="text-emerald-300" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-white">100% Safe</div>
                  <div className="text-xs text-gray-300">Verified Drivers</div>
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="w-10 h-10 bg-blue-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="Clock" size={20} className="text-blue-300" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-white">On-Time</div>
                  <div className="text-xs text-gray-300">98.5% Punctual</div>
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="w-10 h-10 bg-orange-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="MapPin" size={20} className="text-orange-300" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-white">Live Track</div>
                  <div className="text-xs text-gray-300">Real-Time GPS</div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4">
              <Link to="/smart-booking-portal" className="block w-full">
                <Button
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold"
                  iconName="Calendar"
                  iconPosition="left"
                >
                  Book Your Journey
                </Button>
              </Link>

              <Link to="/driver-registration-portal" className="block w-full">
                <Button
                  size="lg"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 text-lg font-semibold"
                  iconName="Truck"
                  iconPosition="left"
                >
                  Drive With Us
                </Button>
              </Link>

              <Link to="/how-it-works" className="block w-full">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full border-white/50 text-white hover:bg-white/10 px-8 py-4 text-lg"
                  iconName="Play"
                  iconPosition="left"
                >
                  How It Works
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Content - Quick Booking Widget */}
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 space-y-6 w-full" style={{ minHeight: '520px' }}>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Quick Booking</h2>
              <p className="text-gray-600">Get instant quotes and book your ride</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <PlacesAutocomplete
                    label="From *"
                    placeholder="Pickup location"
                    value={quickBooking?.from}
                    onChange={(value) => handleQuickBookingChange('from', value)}
                    onPlaceSelect={(placeData) => handlePlaceSelect('from', placeData)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    icon="MapPin"
                  />
                </div>

                <div>
                  <PlacesAutocomplete
                    label="To *"
                    placeholder="Destination"
                    value={quickBooking?.to}
                    onChange={(value) => handleQuickBookingChange('to', value)}
                    onPlaceSelect={(placeData) => handlePlaceSelect('to', placeData)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    icon="Navigation"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                  <div className="relative">
                    <Icon name="Calendar" size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={quickBooking?.date}
                      onChange={(e) => handleQuickBookingChange('date', e?.target?.value)}
                      min={new Date()?.toISOString()?.split('T')?.[0]}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Passengers</label>
                  <div className="relative">
                    <Icon name="Users" size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <select
                      value={quickBooking?.passengers}
                      onChange={(e) => handleQuickBookingChange('passengers', parseInt(e?.target?.value))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
                    >
                      {[...Array(15)]?.map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? 'Passenger' : 'Passengers'}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <Button
                fullWidth
                size="lg"
                onClick={handleQuickBook}
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-white py-4 text-lg font-semibold disabled:opacity-50"
                iconName={loading ? "Loader2" : "Search"}
                iconPosition="left"
              >
                {loading ? 'Processing...' : 'Search Available Rides'}
              </Button>
            </div>

            {/* Popular Routes */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Popular Routes</h3>
              <div className="space-y-2">
                {popularRoutes?.map((route, index) => (
                  <div
                    key={index}
                    onClick={() => handlePopularRouteClick(route)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e?.key === 'Enter' && handlePopularRouteClick(route)}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer smooth-transition"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon name="ArrowRight" size={16} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-800">{route?.from} → {route?.to}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-primary">{route?.price}</div>
                      <div className="text-xs text-gray-500">{route?.duration}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce" aria-hidden="true">
        <Icon name="ChevronDown" size={24} className="text-white/60" />
      </div>
    </section>
  );
};

export default HeroSection;