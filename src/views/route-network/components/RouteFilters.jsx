import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

import Select from '../../../components/ui/Select';

const RouteFilters = ({ filters, onFiltersChange, onClearFilters }) => {
  const routeTypeOptions = [
    { value: '', label: 'All Route Types' },
    { value: 'express', label: 'Express Routes' },
    { value: 'scenic', label: 'Scenic Routes' },
    { value: 'economy', label: 'Economy Routes' },
    { value: 'premium', label: 'Premium Routes' }
  ];

  const distanceOptions = [
    { value: '', label: 'Any Distance' },
    { value: 25, label: 'Under 25km' },
    { value: 50, label: 'Under 50km' },
    { value: 100, label: 'Under 100km' },
    { value: 200, label: 'Under 200km' }
  ];

  const durationOptions = [
    { value: '', label: 'Any Duration' },
    { value: 30, label: 'Under 30 minutes' },
    { value: 60, label: 'Under 1 hour' },
    { value: 120, label: 'Under 2 hours' },
    { value: 240, label: 'Under 4 hours' }
  ];

  const priceOptions = [
    { value: '', label: 'Any Price' },
    { value: 500, label: 'Under ₱500' },
    { value: 1000, label: 'Under ₱1,000' },
    { value: 2000, label: 'Under ₱2,000' },
    { value: 5000, label: 'Under ₱5,000' }
  ];

  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const hasActiveFilters = Object.values(filters)?.some(value => value !== '' && value !== null && value !== false);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center space-x-2">
          <Icon name="Filter" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-gray-900">Filter Routes</h3>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <Icon name="X" size={16} className="mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Filter Grid — overflow-visible so dropdowns aren't clipped */}
      <div className="grid grid-cols-1 gap-4" style={{ overflow: 'visible' }}>
        {/* Route Type Filter */}
        <div className="min-w-0">
          <Select
            label="Route Type"
            options={routeTypeOptions}
            value={filters?.routeType || ''}
            onChange={(value) => handleFilterChange('routeType', value)}
            placeholder="All Route Types"
          />
        </div>

        {/* Distance Filter */}
        <div className="min-w-0">
          <Select
            label="Max Distance"
            options={distanceOptions}
            value={filters?.maxDistance || ''}
            onChange={(value) => handleFilterChange('maxDistance', value)}
            placeholder="Any Distance"
          />
        </div>

        {/* Duration Filter */}
        <div className="min-w-0">
          <Select
            label="Max Duration"
            options={durationOptions}
            value={filters?.maxDuration || ''}
            onChange={(value) => handleFilterChange('maxDuration', value)}
            placeholder="Any Duration"
          />
        </div>

        {/* Price Filter */}
        <div className="min-w-0">
          <Select
            label="Max Price"
            options={priceOptions}
            value={filters?.maxPrice || ''}
            onChange={(value) => handleFilterChange('maxPrice', value)}
            placeholder="Any Price"
          />
        </div>
      </div>

      {/* Quick Filters */}
      <div className="mt-5 pt-5 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Filters</h4>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filters?.routeType === 'express' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('routeType', filters?.routeType === 'express' ? '' : 'express')}
          >
            <Icon name="Zap" size={14} className="mr-1" />
            Express Only
          </Button>
          <Button
            variant={filters?.maxDuration === 60 ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('maxDuration', filters?.maxDuration === 60 ? '' : 60)}
          >
            <Icon name="Clock" size={14} className="mr-1" />
            Under 1 Hour
          </Button>
          <Button
            variant={filters?.maxPrice === 1000 ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('maxPrice', filters?.maxPrice === 1000 ? '' : 1000)}
          >
            <Icon name="DollarSign" size={14} className="mr-1" />
            Budget Friendly
          </Button>
          <Button
            variant={filters?.scenic === true ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('scenic', !filters?.scenic)}
          >
            <Icon name="Mountain" size={14} className="mr-1" />
            Scenic Routes
          </Button>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Icon name="Info" size={16} />
            <span>
              Showing routes matching {Object.values(filters)?.filter(v => v !== '' && v !== null && v !== false)?.length} filter(s)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteFilters;