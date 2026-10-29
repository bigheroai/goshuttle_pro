import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';

const VehicleFilters = ({ 
  filters, 
  onFilterChange, 
  onClearFilters, 
  vehicleCount 
}) => {
  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'economy', label: 'Economy' },
    { value: 'standard', label: 'Standard' },
    { value: 'premium', label: 'Premium' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'van', label: 'Van' },
    { value: 'bus', label: 'Bus' }
  ];

  const capacityOptions = [
    { value: 'all', label: 'Any Capacity' },
    { value: '1-4', label: '1-4 Passengers' },
    { value: '5-8', label: '5-8 Passengers' },
    { value: '9-15', label: '9-15 Passengers' },
    { value: '16+', label: '16+ Passengers' }
  ];

  const priceRangeOptions = [
    { value: 'all', label: 'Any Price' },
    { value: '0-500', label: '₱0 - ₱500/hr' },
    { value: '501-1000', label: '₱501 - ₱1,000/hr' },
    { value: '1001-2000', label: '₱1,001 - ₱2,000/hr' },
    { value: '2001+', label: '₱2,001+/hr' }
  ];

  const amenityOptions = [
    { value: 'wifi', label: 'WiFi', icon: 'Wifi' },
    { value: 'ac', label: 'Air Conditioning', icon: 'Snowflake' },
    { value: 'usb', label: 'USB Charging', icon: 'Zap' },
    { value: 'entertainment', label: 'Entertainment System', icon: 'Monitor' },
    { value: 'refreshments', label: 'Refreshments', icon: 'Coffee' },
    { value: 'wheelchair', label: 'Wheelchair Accessible', icon: 'Accessibility' }
  ];

  const handleAmenityToggle = (amenity) => {
    const currentAmenities = filters?.amenities || [];
    const newAmenities = currentAmenities?.includes(amenity)
      ? currentAmenities?.filter(a => a !== amenity)
      : [...currentAmenities, amenity];
    
    onFilterChange('amenities', newAmenities);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Filter Vehicles</h3>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            {vehicleCount} vehicles found
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-primary hover:text-primary/80"
          >
            <Icon name="X" size={16} className="mr-1" />
            Clear All
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Category Filter */}
        <div>
          <Select
            label="Category"
            options={categoryOptions}
            value={filters?.category || 'all'}
            onChange={(value) => onFilterChange('category', value)}
          />
        </div>

        {/* Capacity Filter */}
        <div>
          <Select
            label="Capacity"
            options={capacityOptions}
            value={filters?.capacity || 'all'}
            onChange={(value) => onFilterChange('capacity', value)}
          />
        </div>

        {/* Price Range Filter */}
        <div>
          <Select
            label="Price Range"
            options={priceRangeOptions}
            value={filters?.priceRange || 'all'}
            onChange={(value) => onFilterChange('priceRange', value)}
          />
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Availability
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters?.availableOnly || false}
                onChange={(e) => onFilterChange('availableOnly', e?.target?.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="ml-2 text-sm text-gray-700">Available only</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters?.premiumOnly || false}
                onChange={(e) => onFilterChange('premiumOnly', e?.target?.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="ml-2 text-sm text-gray-700">Premium only</span>
            </label>
          </div>
        </div>
      </div>
      {/* Amenities Filter */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Required Amenities
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {amenityOptions?.map((amenity) => (
            <button
              key={amenity?.value}
              onClick={() => handleAmenityToggle(amenity?.value)}
              className={`flex items-center justify-center p-3 rounded-lg border-2 smooth-transition ${
                (filters?.amenities || [])?.includes(amenity?.value)
                  ? 'border-primary bg-primary/10 text-primary' :'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <Icon name={amenity?.icon} size={20} className="mb-1" />
              <span className="text-xs font-medium mt-1">{amenity?.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VehicleFilters;