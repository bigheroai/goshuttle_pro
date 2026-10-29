import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import VehicleCard from './components/VehicleCard';
import VehicleFilters from './components/VehicleFilters';
import VehicleDetailsModal from './components/VehicleDetailsModal';
import VehicleComparison from './components/VehicleComparison';
import vehicleService from '../../utils/vehicleService';

const VEHICLE_TYPE_CATEGORY_MAP = {
  van: 'Van',
  shuttle: 'Shuttle',
  executive_car: 'Executive',
  corporate_car: 'Corporate'
};

const AMENITY_ICONS = {
  'Air Conditioning': 'Snowflake',
  'WiFi': 'Wifi',
  'USB Charging Ports': 'Zap',
  'Reclining Seats': 'Armchair',
  'Luggage Storage': 'Package',
  'Entertainment System': 'Monitor',
  'Leather Seats': 'Armchair',
  'Tinted Windows': 'Eye',
  'Privacy Glass': 'Eye',
  'Bottled Water': 'Coffee',
  'Sunroof': 'Sun',
  'GPS Navigation': 'Navigation',
  'Professional Interior': 'Briefcase',
  'Spacious Cabin': 'Maximize',
  'Luggage Space': 'Package'
};

/**
 * Map a database vehicle record to the fleet showcase display format
 */
const mapVehicleToShowcase = (vehicle) => {
  const features = Array.isArray(vehicle?.features)
    ? vehicle.features
    : (typeof vehicle?.features === 'string'
      ? (() => { try { return JSON.parse(vehicle.features); } catch { return [vehicle.features]; } })()
      : []);

  const amenities = features?.map(f => ({
    name: f,
    icon: AMENITY_ICONS[f] || 'Check'
  }));

  const category = VEHICLE_TYPE_CATEGORY_MAP[vehicle?.vehicleType] || vehicle?.vehicleType || 'Standard';
  const isPremium = ['executive_car', 'corporate_car'].includes(vehicle?.vehicleType);

  return {
    id: vehicle?.id,
    name: vehicle?.name,
    category,
    capacity: vehicle?.capacity || 4,
    luggage: `${Math.floor((vehicle?.capacity || 4) / 2)} Bags`,
    fuelType: 'Diesel',
    pricePerHour: vehicle?.dailyRate || 0,
    rating: 4.7,
    reviewCount: 0,
    status: vehicle?.status === 'active' ? 'available' : vehicle?.status || 'available',
    isPremium,
    description: vehicle?.description || `${vehicle?.name} — reliable and comfortable transportation.`,
    images: [
      {
        url: vehicle?.imageUrl || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80',
        alt: `${vehicle?.name} — ${category} vehicle for passenger transport`
      }
    ],
    amenities: amenities?.length > 0 ? amenities : [
      { name: 'Air Conditioning', icon: 'Snowflake' },
      { name: 'WiFi', icon: 'Wifi' }
    ],
    specifications: [
      { label: 'Vehicle Type', value: category },
      { label: 'Capacity', value: `${vehicle?.capacity || 4} passengers` },
      { label: 'Daily Rate', value: `₱${(vehicle?.dailyRate || 0)?.toLocaleString()}` },
      { label: 'Status', value: vehicle?.status === 'active' ? 'Available' : vehicle?.status || 'Available' }
    ],
    reviews: [],
    maintenanceRecords: [],
    // Keep original fields for booking
    vehicleType: vehicle?.vehicleType,
    dailyRate: vehicle?.dailyRate,
    imageUrl: vehicle?.imageUrl
  };
};

const FleetShowcase = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [filters, setFilters] = useState({});
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comparisonVehicles, setComparisonVehicles] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Fetch vehicles from database
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data = await vehicleService?.getAll();
        const activeVehicles = (data || [])
          ?.filter(v => v?.status === 'active')
          ?.map(mapVehicleToShowcase);
        setVehicles(activeVehicles);
        setFilteredVehicles(activeVehicles);
      } catch (err) {
        console.error('Error loading fleet:', err);
        setLoadError('Unable to load fleet data. Please try again.');
        setVehicles([]);
        setFilteredVehicles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, vehicles, sortBy]);

  const applyFilters = () => {
    let filtered = [...vehicles];

    if (filters?.category && filters?.category !== 'all') {
      filtered = filtered?.filter((vehicle) =>
        vehicle?.category?.toLowerCase()?.includes(filters?.category?.toLowerCase())
      );
    }

    if (filters?.capacity && filters?.capacity !== 'all') {
      const [min, max] = filters?.capacity?.split('-')?.map((n) => n?.replace('+', ''));
      filtered = filtered?.filter((vehicle) => {
        if (max) return vehicle?.capacity >= parseInt(min) && vehicle?.capacity <= parseInt(max);
        return vehicle?.capacity >= parseInt(min);
      });
    }

    if (filters?.priceRange && filters?.priceRange !== 'all') {
      const [min, max] = filters?.priceRange?.split('-')?.map((n) => n?.replace('+', ''));
      filtered = filtered?.filter((vehicle) => {
        if (max) return vehicle?.pricePerHour >= parseInt(min) && vehicle?.pricePerHour <= parseInt(max);
        return vehicle?.pricePerHour >= parseInt(min);
      });
    }

    if (filters?.availableOnly) {
      filtered = filtered?.filter((vehicle) => vehicle?.status === 'available');
    }

    if (filters?.premiumOnly) {
      filtered = filtered?.filter((vehicle) => vehicle?.isPremium);
    }

    if (filters?.amenities && filters?.amenities?.length > 0) {
      filtered = filtered?.filter((vehicle) =>
        filters?.amenities?.every((amenity) =>
          vehicle?.amenities?.some((vehicleAmenity) =>
            vehicleAmenity?.name?.toLowerCase()?.includes(amenity?.toLowerCase())
          )
        )
      );
    }

    filtered?.sort((a, b) => {
      switch (sortBy) {
        case 'price-low': return a?.pricePerHour - b?.pricePerHour;
        case 'price-high': return b?.pricePerHour - a?.pricePerHour;
        case 'rating': return b?.rating - a?.rating;
        case 'capacity': return b?.capacity - a?.capacity;
        default: return a?.name?.localeCompare(b?.name);
      }
    });

    setFilteredVehicles(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleViewDetails = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleBookNow = (vehicle) => {
    navigate('/smart-booking-portal', { state: { selectedVehicle: vehicle } });
  };

  const handleAddToComparison = (vehicle) => {
    if (comparisonVehicles?.length < 3 && !comparisonVehicles?.find((v) => v?.id === vehicle?.id)) {
      setComparisonVehicles((prev) => [...prev, vehicle]);
    }
  };

  const handleRemoveFromComparison = (vehicleId) => {
    setComparisonVehicles((prev) => prev?.filter((v) => v?.id !== vehicleId));
  };

  const handleClearComparison = () => {
    setComparisonVehicles([]);
  };

  const sortOptions = [
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'price-low', label: 'Price (Low to High)' },
    { value: 'price-high', label: 'Price (High to Low)' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'capacity', label: 'Largest Capacity' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <section className="pt-20 pb-12 operational-gradient text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white drop-shadow-lg">
              Our Premium Fleet
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8 drop-shadow-md">
              Discover our comprehensive range of vehicles designed for every journey. 
              From economy rides to luxury transportation, we have the perfect vehicle for your needs.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="flex items-center space-x-2 text-white/95">
                <Icon name="Shield" size={20} />
                <span>Safety Certified</span>
              </div>
              <div className="flex items-center space-x-2 text-white/95">
                <Icon name="Clock" size={20} />
                <span>24/7 Available</span>
              </div>
              <div className="flex items-center space-x-2 text-white/95">
                <Icon name="Star" size={20} />
                <span>Premium Quality</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Icon name="Loader2" size={32} className="animate-spin text-primary mr-3" />
            <span className="text-gray-600 text-lg">Loading fleet inventory...</span>
          </div>
        )}

        {/* Error State */}
        {!loading && loadError && (
          <div className="text-center py-12">
            <Icon name="AlertCircle" size={48} className="mx-auto text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Fleet</h3>
            <p className="text-gray-600 mb-4">{loadError}</p>
            <Button onClick={() => window.location?.reload()} variant="outline">
              <Icon name="RefreshCw" size={16} className="mr-2" />
              Try Again
            </Button>
          </div>
        )}

        {!loading && !loadError && (
          <>
            {/* Filters */}
            <div className="mb-8">
              <VehicleFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                vehicleCount={filteredVehicles?.length}
              />
            </div>

            {/* Sort and View Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                <span className="text-sm font-medium text-gray-700">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e?.target?.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {sortOptions?.map((option) => (
                    <option key={option?.value} value={option?.value}>{option?.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {filteredVehicles?.length} of {vehicles?.length} vehicles
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <Icon name="Grid3X3" size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-primary text-white' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <Icon name="List" size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Vehicle Grid */}
            {filteredVehicles?.length > 0 ? (
              <div className={`grid gap-6 mb-12 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {filteredVehicles?.map((vehicle) => (
                  <div key={vehicle?.id} className="relative">
                    <VehicleCard
                      vehicle={vehicle}
                      onViewDetails={handleViewDetails}
                      onBookNow={handleBookNow}
                    />
                    <button
                      onClick={() => handleAddToComparison(vehicle)}
                      disabled={comparisonVehicles?.length >= 3 || comparisonVehicles?.find((v) => v?.id === vehicle?.id)}
                      className="absolute top-4 right-4 w-8 h-8 bg-white/90 hover:bg-white text-gray-600 hover:text-primary rounded-full flex items-center justify-center shadow-md smooth-transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Add to comparison"
                    >
                      <Icon name="Plus" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Icon name="Search" size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles found</h3>
                <p className="text-gray-600 mb-4">
                  {vehicles?.length === 0
                    ? 'No vehicles are currently available in the fleet.' :'Try adjusting your filters to see more results.'}
                </p>
                {vehicles?.length > 0 && (
                  <Button onClick={handleClearFilters} variant="outline">
                    Clear All Filters
                  </Button>
                )}
              </div>
            )}

            {/* Vehicle Comparison */}
            {comparisonVehicles?.length > 0 && (
              <div className="mb-8">
                <VehicleComparison
                  vehicles={comparisonVehicles}
                  onRemoveVehicle={handleRemoveFromComparison}
                  onBookVehicle={handleBookNow}
                  onClearComparison={handleClearComparison}
                />
              </div>
            )}

            {/* Call to Action */}
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Need Help Choosing the Right Vehicle?
              </h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Our transportation experts are here to help you select the perfect vehicle 
                for your specific needs and budget.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                <Button
                  onClick={() => navigate('/support-center')}
                  variant="outline"
                  className="text-primary border-primary hover:bg-primary hover:text-white"
                >
                  <Icon name="MessageCircle" size={16} className="mr-2" />
                  Chat with Expert
                </Button>
                <Button
                  onClick={() => navigate('/smart-booking-portal')}
                  className="bg-conversion-accent hover:bg-conversion-accent/90"
                >
                  <Icon name="Calendar" size={16} className="mr-2" />
                  Book Your Journey
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Vehicle Details Modal */}
      <VehicleDetailsModal
        vehicle={selectedVehicle}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onBookNow={handleBookNow}
      />

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-operational-gradient rounded-lg flex items-center justify-center">
                  <Icon name="Zap" size={24} color="white" strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold tracking-tight">GoShuttle</span>
                  <span className="text-xs font-medium text-gray-300 -mt-1">Pro</span>
                </div>
              </div>
              <p className="text-gray-300 mb-4 max-w-md">
                Premium shuttle and van booking platform transforming ground transportation 
                into a seamless, technology-driven experience.
              </p>
              <div className="flex space-x-4">
                <Icon name="Facebook" size={20} className="text-gray-400 hover:text-white cursor-pointer" />
                <Icon name="Twitter" size={20} className="text-gray-400 hover:text-white cursor-pointer" />
                <Icon name="Instagram" size={20} className="text-gray-400 hover:text-white cursor-pointer" />
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="/smart-booking-portal" className="hover:text-white">Book Now</a></li>
                <li><a href="/route-network" className="hover:text-white">Routes</a></li>
                <li><a href="/live-tracking" className="hover:text-white">Track Journey</a></li>
                <li><a href="/support-center" className="hover:text-white">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center space-x-2">
                  <Icon name="Phone" size={16} />
                  <span>+63 917 123 4567</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Icon name="Mail" size={16} />
                  <span>info@goshuttlepro.com</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Icon name="MapPin" size={16} />
                  <span>Manila, Philippines</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date()?.getFullYear()} GoShuttle Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FleetShowcase;