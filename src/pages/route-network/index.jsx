import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import RouteMap from './components/RouteMap';
import RouteFilters from './components/RouteFilters';
import RouteList from './components/RouteList';
import RouteDetails from './components/RouteDetails';
import PopularDestinations from './components/PopularDestinations';
import RouteCalculator from './components/RouteCalculator';
import destinationSettingsService from '../../services/destinationSettingsService';

const RouteNetwork = () => {
  const navigate = useNavigate();
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const [filters, setFilters] = useState({
    routeType: '',
    maxDistance: '',
    maxDuration: '',
    maxPrice: '',
    scenic: false
  });
  const [activeView, setActiveView] = useState('map');
  const [destinationRestrictions, setDestinationRestrictions] = useState(null);

  useEffect(() => {
    loadDestinationRestrictions();
  }, []);

  const loadDestinationRestrictions = async () => {
    try {
      const data = await destinationSettingsService?.getDestinationRestrictions();
      setDestinationRestrictions(data);
    } catch {
      // silently fail
    }
  };

  const isDestinationAllowed = (locationName) => {
    if (!destinationRestrictions?.enabled) return true;
    const allowed = destinationRestrictions?.allowed_destinations || [];
    if (allowed?.length === 0) return true;
    return allowed?.some(d =>
      locationName?.toLowerCase()?.includes(d?.toLowerCase()) ||
      d?.toLowerCase()?.includes(locationName?.toLowerCase())
    );
  };

  // Mock route data
  const routes = [
  {
    id: 1,
    from: "Quezon City",
    to: "Makati",
    distance: 18,
    duration: 45,
    price: 350,
    popularity: 92,
    type: "express",
    trafficCondition: "heavy",
    startLocation: { lat: 14.6760, lng: 121.0437 },
    endLocation: { lat: 14.5547, lng: 121.0244 },
    features: ["Express Service", "Air Conditioning", "Door-to-Door"],
    destinationImage: "https://images.unsplash.com/photo-1668563972736-157f88ddbf7b",
    destinationImageAlt: "Makati city skyline with modern skyscrapers and business district at dusk",
    description: `Fast and reliable shuttle service from Quezon City to Makati CBD. Ideal for daily commuters and business travelers heading to the financial district.`,
    alternativeRoutes: 3,
    schedules: [
    { departure: "Every 30 mins", arrival: "45 mins later", availableSeats: 8, price: 350 }]
  },
  {
    id: 2,
    from: "Alabang",
    to: "Tagaytay",
    distance: 35,
    duration: 90,
    price: 600,
    popularity: 85,
    type: "scenic",
    trafficCondition: "light",
    startLocation: { lat: 14.4297, lng: 121.0403 },
    endLocation: { lat: 14.1159, lng: 120.9621 },
    features: ["Scenic Route", "Photo Stops", "Climate Control"],
    destinationImage: "https://images.unsplash.com/photo-1594706504824-7ec050b66344",
    destinationImageAlt: "Panoramic view of Taal Lake and volcano from Tagaytay ridge with lush greenery",
    description: `Enjoy the cool mountain breeze and stunning views of Taal Lake on this scenic route from Alabang to Tagaytay. Perfect for weekend getaways.`,
    alternativeRoutes: 1,
    schedules: [
    { departure: "07:00 AM", arrival: "08:30 AM", availableSeats: 10, price: 600 },
    { departure: "03:00 PM", arrival: "04:30 PM", availableSeats: 12, price: 600 }]
  },
  {
    id: 3,
    from: "Calamba",
    to: "Makati",
    distance: 55,
    duration: 105,
    price: 750,
    popularity: 78,
    type: "express",
    trafficCondition: "moderate",
    startLocation: { lat: 14.2115, lng: 121.1653 },
    endLocation: { lat: 14.5547, lng: 121.0244 },
    features: ["Express Service", "WiFi", "Comfort Stops"],
    destinationImage: "https://images.unsplash.com/photo-1668563972736-157f88ddbf7b",
    destinationImageAlt: "Makati city skyline with modern skyscrapers and business district at dusk",
    description: `Convenient express shuttle from Calamba, Laguna to Makati CBD. A popular choice for Laguna-based professionals working in Metro Manila.`,
    alternativeRoutes: 2,
    schedules: [
    { departure: "05:30 AM", arrival: "07:15 AM", availableSeats: 12, price: 750 },
    { departure: "06:00 AM", arrival: "07:45 AM", availableSeats: 10, price: 750 }]
  },
  {
    id: 4,
    from: "Sto. Tomas Batangas",
    to: "Makati",
    distance: 70,
    duration: 120,
    price: 850,
    popularity: 65,
    type: "express",
    trafficCondition: "moderate",
    startLocation: { lat: 14.1057, lng: 121.1690 },
    endLocation: { lat: 14.5547, lng: 121.0244 },
    features: ["Express Service", "Air Conditioning", "Luggage Space"],
    destinationImage: "https://images.unsplash.com/photo-1668563972736-157f88ddbf7b",
    destinationImageAlt: "Makati city skyline with modern skyscrapers and business district at dusk",
    description: `Direct shuttle service from Sto. Tomas, Batangas to Makati. Serving commuters from the CALABARZON region heading to Metro Manila.`,
    alternativeRoutes: 2,
    schedules: [
    { departure: "05:00 AM", arrival: "07:00 AM", availableSeats: 14, price: 850 },
    { departure: "06:00 AM", arrival: "08:00 AM", availableSeats: 12, price: 850 }]
  },
  {
    id: 5,
    from: "Cavite",
    to: "Alabang",
    distance: 22,
    duration: 40,
    price: 400,
    popularity: 72,
    type: "economy",
    trafficCondition: "light",
    startLocation: { lat: 14.4791, lng: 120.8970 },
    endLocation: { lat: 14.4297, lng: 121.0403 },
    features: ["Economy Pricing", "Air Conditioning", "Frequent Trips"],
    destinationImage: "https://images.unsplash.com/photo-1711076234443-c9bc6bbf1b53",
    destinationImageAlt: "Busy transport hub with vehicles and passengers in a southern Metro Manila area",
    description: `Affordable and frequent shuttle service from Cavite to Alabang. Ideal for daily commuters traveling between Cavite province and the south of Metro Manila.`,
    alternativeRoutes: 1,
    schedules: [
    { departure: "Every 30 mins", arrival: "40 mins later", availableSeats: 10, price: 400 }]
  },
  {
    id: 6,
    from: "Tagaytay",
    to: "Quezon City",
    distance: 68,
    duration: 120,
    price: 800,
    popularity: 60,
    type: "scenic",
    trafficCondition: "light",
    startLocation: { lat: 14.1159, lng: 120.9621 },
    endLocation: { lat: 14.6760, lng: 121.0437 },
    features: ["Scenic Route", "Photo Stops", "Local Guide", "Climate Control"],
    destinationImage: "https://images.unsplash.com/photo-1594706504824-7ec050b66344",
    destinationImageAlt: "Panoramic view of Taal Lake and volcano from Tagaytay ridge with lush greenery",
    description: `Return scenic route from Tagaytay to Quezon City. Enjoy the cool mountain air before heading back to the city after a relaxing weekend getaway.`,
    alternativeRoutes: 1,
    schedules: [
    { departure: "10:00 AM", arrival: "12:00 PM", availableSeats: 10, price: 800 },
    { departure: "04:00 PM", arrival: "06:00 PM", availableSeats: 14, price: 800 }]
  }];


  // Mock popular destinations data
  const popularDestinations = [
  {
    id: 1,
    name: "Quezon City",
    location: "Metro Manila",
    popularity: 92,
    routeCount: 8,
    monthlyBookings: 4200,
    avgDuration: 45,
    startingPrice: 350,
    image: "https://images.unsplash.com/photo-1681136998375-3a78cc07e8f2",
    imageAlt: "Quezon City urban landscape with busy streets and commercial buildings",
    features: ["Business Hub", "Multiple Routes", "24/7 Service"]
  },
  {
    id: 2,
    name: "Makati",
    location: "Metro Manila",
    popularity: 95,
    routeCount: 12,
    monthlyBookings: 5800,
    avgDuration: 60,
    startingPrice: 350,
    image: "https://images.unsplash.com/photo-1668563972736-157f88ddbf7b",
    imageAlt: "Makati city skyline with modern skyscrapers and business district at dusk",
    features: ["Financial District", "Express Service", "Corporate Preferred"]
  },
  {
    id: 3,
    name: "Tagaytay",
    location: "Cavite Province",
    popularity: 85,
    routeCount: 6,
    monthlyBookings: 2200,
    avgDuration: 90,
    startingPrice: 600,
    image: "https://images.unsplash.com/photo-1594706504824-7ec050b66344",
    imageAlt: "Panoramic view of Taal Lake and volcano from Tagaytay ridge with lush greenery",
    features: ["Cool Weather", "Lake Views", "Restaurants"]
  },
  {
    id: 4,
    name: "Calamba",
    location: "Laguna Province",
    popularity: 75,
    routeCount: 5,
    monthlyBookings: 1600,
    avgDuration: 105,
    startingPrice: 750,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1ece0de37-1776232224956.png",
    imageAlt: "Calamba city view with residential and commercial areas in Laguna province",
    features: ["CALABARZON Hub", "Residential Area", "Growing City"]
  },
  {
    id: 5,
    name: "Alabang",
    location: "Muntinlupa City",
    popularity: 80,
    routeCount: 7,
    monthlyBookings: 2800,
    avgDuration: 40,
    startingPrice: 400,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_19069bd54-1776232224906.png",
    imageAlt: "Alabang commercial district with shopping malls and business establishments in Muntinlupa",
    features: ["South Hub", "Shopping Centers", "Business District"]
  },
  {
    id: 6,
    name: "Cavite",
    location: "Cavite Province",
    popularity: 70,
    routeCount: 5,
    monthlyBookings: 1900,
    avgDuration: 50,
    startingPrice: 400,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1a5128428-1776232224894.png",
    imageAlt: "Cavite province coastal area with residential neighborhoods and commercial zones",
    features: ["Coastal Province", "Affordable Fares", "Frequent Trips"]
  }];


  const handleRouteSelect = (route) => {
    setSelectedRoute(route);
  };

  const handleRouteDetails = (route) => {
    setSelectedRoute(route);
    setShowRouteDetails(true);
  };

  const handleBookRoute = (route) => {
    navigate('/smart-booking-portal', {
      state: {
        selectedRoute: route,
        from: route?.from,
        to: route?.to
      }
    });
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      routeType: '',
      maxDistance: '',
      maxDuration: '',
      maxPrice: '',
      scenic: false
    });
  };

  const handleDestinationSelect = (destination) => {
    const destinationRoutes = routes?.filter((route) =>
      route?.to?.toLowerCase()?.includes(destination?.name?.toLowerCase()) ||
      route?.from?.toLowerCase()?.includes(destination?.name?.toLowerCase())
    );

    if (destinationRoutes?.length > 0) {
      setSelectedRoute(destinationRoutes?.[0]);
      setShowRouteDetails(true);
      setActiveView('map');
      // Scroll to map section
      setTimeout(() => {
        const mapEl = document.getElementById('route-map-section');
        if (mapEl) {
          mapEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      // No matching route found - switch to list view to show all routes
      setActiveView('list');
      const listEl = document.getElementById('route-list-section');
      if (listEl) {
        listEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleCalculateRoute = (calculationResult) => {
    // Handle route calculation result
    console.log('Route calculation result:', calculationResult);
  };

  const handleQuickBook = (bookingData) => {
    navigate('/smart-booking-portal', {
      state: {
        calculationData: bookingData
      }
    });
  };

  const filteredRoutes = routes?.filter((route) => {
    if (filters?.maxDistance && route?.distance > filters?.maxDistance) return false;
    if (filters?.maxDuration && route?.duration > filters?.maxDuration) return false;
    if (filters?.maxPrice && route?.price > filters?.maxPrice) return false;
    if (filters?.routeType && route?.type !== filters?.routeType) return false;
    if (filters?.scenic && route?.type !== 'scenic') return false;
    // Apply destination restrictions
    if (destinationRestrictions?.enabled) {
      if (!isDestinationAllowed(route?.from) || !isDestinationAllowed(route?.to)) return false;
    }
    return true;
  });

  const filteredPopularDestinations = popularDestinations?.filter((dest) => {
    if (!destinationRestrictions?.enabled) return true;
    return isDestinationAllowed(dest?.name);
  });

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Route Network - Interactive Route Planning | GoShuttle Pro</title>
        <meta name="description" content="Explore our comprehensive route network with interactive maps, real-time traffic updates, and transparent pricing. Plan your journey with multiple route options and instant booking." />
        <meta name="keywords" content="route network, interactive map, route planning, shuttle routes, transportation network, travel routes Philippines" />
      </Helmet>
      <Header />
      <main className="pt-16">
        {/* Hero Section */}
        <section style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #004499 100%)' }} className="text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                Explore Our Route Network
              </h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
                Discover comprehensive coverage across the service region with interactive maps, 
                real-time traffic updates, and transparent pricing for every destination.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2 text-white">150+</div>
                <div className="text-blue-100">Active Routes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2 text-white">50+</div>
                <div className="text-blue-100">Destinations</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2 text-white">98%</div>
                <div className="text-blue-100">On-Time Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2 text-white">24/7</div>
                <div className="text-blue-100">Live Tracking</div>
              </div>
            </div>
          </div>
        </section>

        {/* View Toggle */}
        <section className="py-8 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold text-gray-900">Route Explorer</h2>
                <span className="text-gray-500">({filteredRoutes?.length} routes available)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant={activeView === 'map' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveView('map')}>

                  <Icon name="Map" size={16} className="mr-2" />
                  Map View
                </Button>
                <Button
                  variant={activeView === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveView('list')}>

                  <Icon name="List" size={16} className="mr-2" />
                  List View
                </Button>
                <Button
                  variant={activeView === 'calculator' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveView('calculator')}>

                  <Icon name="Calculator" size={16} className="mr-2" />
                  Calculator
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Filters Sidebar */}
              <div className="lg:col-span-1">
                <RouteFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onClearFilters={handleClearFilters} />

              </div>

              {/* Main Content Area */}
              <div className="lg:col-span-3" id="route-map-section">
                {activeView === 'map' &&
                <div className="h-96 lg:h-[600px] rounded-lg overflow-hidden shadow-sm">
                    <RouteMap
                    selectedRoute={selectedRoute}
                    onRouteSelect={handleRouteSelect}
                    routes={filteredRoutes}
                    filters={filters} />

                  </div>
                }

                {activeView === 'list' &&
                <div id="route-list-section">
                  <RouteList
                    routes={filteredRoutes}
                    selectedRoute={selectedRoute}
                    onRouteSelect={handleRouteDetails}
                    onBookRoute={handleBookRoute} />
                </div>
                }

                {activeView === 'calculator' &&
                <RouteCalculator
                  onCalculate={handleCalculateRoute}
                  onQuickBook={handleQuickBook} />

                }
              </div>
            </div>
          </div>
        </section>

        {/* Popular Destinations */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <PopularDestinations
              destinations={filteredPopularDestinations}
              onDestinationSelect={handleDestinationSelect} />

          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Advanced Route Planning Features
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Experience the future of transportation planning with our intelligent route optimization system.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Navigation" size={32} className="text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Real-Time Traffic</h3>
                <p className="text-gray-600">
                  Live traffic monitoring and route optimization to ensure the fastest journey times.
                </p>
              </div>

              <div className="text-center p-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="DollarSign" size={32} className="text-secondary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Transparent Pricing</h3>
                <p className="text-gray-600">
                  Clear, upfront pricing with no hidden fees. Compare options and choose what works best.
                </p>
              </div>

              <div className="text-center p-6">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="MapPin" size={32} className="text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Multiple Options</h3>
                <p className="text-gray-600">
                  Choose from express, scenic, or economy routes based on your preferences and budget.
                </p>
              </div>

              <div className="text-center p-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Clock" size={32} className="text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Schedule Flexibility</h3>
                <p className="text-gray-600">
                  Multiple departure times throughout the day to fit your schedule perfectly.
                </p>
              </div>

              <div className="text-center p-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Shield" size={32} className="text-red-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Safety First</h3>
                <p className="text-gray-600">
                  All routes monitored for safety with regular vehicle maintenance and driver training.
                </p>
              </div>

              <div className="text-center p-6">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Smartphone" size={32} className="text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Mobile Optimized</h3>
                <p className="text-gray-600">
                  Plan and book your routes on any device with our responsive mobile interface.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 operational-gradient text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-6">
              Ready to Plan Your Journey?
            </h2>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Use our route calculator to find the perfect transportation solution for your needs, 
              or browse our popular destinations to discover new places to explore.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => setActiveView('calculator')}
                className="bg-white text-primary hover:bg-gray-100">

                <Icon name="Calculator" size={20} className="mr-2" />
                Calculate Route & Price
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/smart-booking-portal')}
                className="border-white text-white hover:bg-white hover:text-primary">

                <Icon name="Calendar" size={20} className="mr-2" />
                Book Journey Now
              </Button>
            </div>
          </div>
        </section>
      </main>
      {/* Route Details Modal */}
      {showRouteDetails && selectedRoute &&
      <RouteDetails
        route={selectedRoute}
        onClose={() => setShowRouteDetails(false)}
        onBookRoute={handleBookRoute} />

      }
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-operational-gradient rounded-lg flex items-center justify-center">
                  <Icon name="Zap" size={24} color="white" strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold tracking-tight">GoShuttle</span>
                  <span className="text-xs font-medium text-blue-300 -mt-1">Pro</span>
                </div>
              </div>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Premium shuttle and van booking platform transforming ground transportation 
                into a seamless, technology-driven experience across the Philippines.
              </p>
              <div className="flex space-x-4">
                <Icon name="Facebook" size={20} className="text-gray-400 hover:text-white cursor-pointer" />
                <Icon name="Twitter" size={20} className="text-gray-400 hover:text-white cursor-pointer" />
                <Icon name="Instagram" size={20} className="text-gray-400 hover:text-white cursor-pointer" />
                <Icon name="Linkedin" size={20} className="text-gray-400 hover:text-white cursor-pointer" />
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="/homepage" className="hover:text-white smooth-transition">Home</a></li>
                <li><a href="/smart-booking-portal" className="hover:text-white smooth-transition">Book Now</a></li>
                <li><a href="/fleet-showcase" className="hover:text-white smooth-transition">Our Fleet</a></li>
                <li><a href="/support-center" className="hover:text-white smooth-transition">Support</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Contact Info</h4>
              <div className="space-y-2 text-gray-300">
                <div className="flex items-center space-x-2">
                  <Icon name="Phone" size={16} />
                  <span>+63 2 8123 4567</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Icon name="Mail" size={16} />
                  <span>info@goshuttlepro.ph</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Icon name="MapPin" size={16} />
                  <span>Manila, Philippines</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date()?.getFullYear()} GoShuttle Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>);

};

export default RouteNetwork;