import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const RouteCalculator = ({ onCalculate, onQuickBook }) => {
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    passengers: 1,
    vehicleType: '',
    travelDate: '',
    travelTime: '',
    routePreference: 'fastest'
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState(null);

  const locationOptions = [
    { value: '', label: 'Select location' },
    { value: 'manila', label: 'Manila' },
    { value: 'quezon-city', label: 'Quezon City' },
    { value: 'makati', label: 'Makati' },
    { value: 'bgc', label: 'Bonifacio Global City' },
    { value: 'ortigas', label: 'Ortigas Center' },
    { value: 'alabang', label: 'Alabang' },
    { value: 'naia', label: 'NAIA Airport' },
    { value: 'clark', label: 'Clark Airport' },
    { value: 'baguio', label: 'Baguio City' },
    { value: 'tagaytay', label: 'Tagaytay' },
    { value: 'batangas', label: 'Batangas' },
    { value: 'subic', label: 'Subic Bay' }
  ];

  const vehicleTypeOptions = [
    { value: '', label: 'Any vehicle type' },
    { value: 'van', label: 'Van (7-12 passengers)' },
    { value: 'minibus', label: 'Mini Bus (13-25 passengers)' },
    { value: 'bus', label: 'Bus (26+ passengers)' },
    { value: 'luxury', label: 'Luxury Vehicle' }
  ];

  const routePreferenceOptions = [
    { value: 'fastest', label: 'Fastest Route' },
    { value: 'cheapest', label: 'Most Economical' },
    { value: 'scenic', label: 'Scenic Route' },
    { value: 'comfortable', label: 'Most Comfortable' }
  ];

  const passengerOptions = Array.from({ length: 50 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1} passenger${i > 0 ? 's' : ''}`
  }));

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear previous calculation when form changes
    if (calculationResult) {
      setCalculationResult(null);
    }
  };

  const handleCalculate = async () => {
    if (!formData?.from || !formData?.to) {
      return;
    }

    setIsCalculating(true);
    
    // Simulate calculation delay
    setTimeout(() => {
      const mockResult = {
        distance: Math.floor(Math.random() * 200) + 20,
        duration: Math.floor(Math.random() * 180) + 30,
        estimatedPrice: Math.floor(Math.random() * 3000) + 500,
        routeOptions: [
          {
            id: 1,
            name: 'Express Route',
            duration: Math.floor(Math.random() * 120) + 30,
            price: Math.floor(Math.random() * 2000) + 800,
            features: ['Fastest', 'Highway Route', 'Limited Stops']
          },
          {
            id: 2,
            name: 'Economy Route',
            duration: Math.floor(Math.random() * 150) + 60,
            price: Math.floor(Math.random() * 1500) + 500,
            features: ['Budget Friendly', 'Multiple Stops', 'City Route']
          },
          {
            id: 3,
            name: 'Scenic Route',
            duration: Math.floor(Math.random() * 200) + 90,
            price: Math.floor(Math.random() * 2500) + 700,
            features: ['Scenic Views', 'Tourist Spots', 'Photo Opportunities']
          }
        ]
      };
      
      setCalculationResult(mockResult);
      setIsCalculating(false);
      onCalculate && onCalculate(mockResult);
    }, 2000);
  };

  const handleQuickBook = (routeOption) => {
    const bookingData = {
      ...formData,
      selectedRoute: routeOption,
      calculationResult
    };
    onQuickBook && onQuickBook(bookingData);
  };

  const isFormValid = formData?.from && formData?.to && formData?.passengers;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Icon name="Calculator" size={20} className="text-primary" />
        <h3 className="text-lg font-semibold">Route Calculator</h3>
      </div>
      <div className="space-y-4">
        {/* From and To Locations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="From"
            options={locationOptions}
            value={formData?.from}
            onChange={(value) => handleInputChange('from', value)}
            placeholder="Select departure location"
            required
          />
          <Select
            label="To"
            options={locationOptions}
            value={formData?.to}
            onChange={(value) => handleInputChange('to', value)}
            placeholder="Select destination"
            required
          />
        </div>

        {/* Passengers and Vehicle Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Number of Passengers"
            options={passengerOptions}
            value={formData?.passengers}
            onChange={(value) => handleInputChange('passengers', value)}
            searchable
          />
          <Select
            label="Vehicle Type"
            options={vehicleTypeOptions}
            value={formData?.vehicleType}
            onChange={(value) => handleInputChange('vehicleType', value)}
            placeholder="Any vehicle type"
          />
        </div>

        {/* Travel Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Travel Date"
            type="date"
            value={formData?.travelDate}
            onChange={(e) => handleInputChange('travelDate', e?.target?.value)}
            min={new Date()?.toISOString()?.split('T')?.[0]}
          />
          <Input
            label="Preferred Time"
            type="time"
            value={formData?.travelTime}
            onChange={(e) => handleInputChange('travelTime', e?.target?.value)}
          />
        </div>

        {/* Route Preference */}
        <Select
          label="Route Preference"
          options={routePreferenceOptions}
          value={formData?.routePreference}
          onChange={(value) => handleInputChange('routePreference', value)}
        />

        {/* Calculate Button */}
        <Button
          fullWidth
          onClick={handleCalculate}
          disabled={!isFormValid || isCalculating}
          loading={isCalculating}
          className="bg-primary hover:bg-primary/90"
        >
          <Icon name="Calculator" size={16} className="mr-2" />
          {isCalculating ? 'Calculating Routes...' : 'Calculate Routes & Pricing'}
        </Button>
      </div>
      {/* Calculation Results */}
      {calculationResult && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-semibold mb-4">Route Options</h4>
          
          {/* Summary */}
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-primary">{calculationResult?.distance}km</div>
                <div className="text-xs text-gray-600">Total Distance</div>
              </div>
              <div>
                <div className="text-lg font-bold text-primary">{calculationResult?.duration}min</div>
                <div className="text-xs text-gray-600">Avg Duration</div>
              </div>
              <div>
                <div className="text-lg font-bold text-primary">₱{calculationResult?.estimatedPrice?.toLocaleString()}</div>
                <div className="text-xs text-gray-600">Est. Price</div>
              </div>
            </div>
          </div>

          {/* Route Options */}
          <div className="space-y-3">
            {calculationResult?.routeOptions?.map((option) => (
              <div key={option?.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium">{option?.name}</h5>
                  <div className="text-right">
                    <div className="font-bold text-primary">₱{option?.price?.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{option?.duration}min</div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {option?.features?.map((feature, index) => (
                    <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {feature}
                    </span>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={() => handleQuickBook(option)}
                  className="hover:bg-conversion-accent hover:text-white hover:border-conversion-accent"
                >
                  <Icon name="Calendar" size={14} className="mr-1" />
                  Book This Route
                </Button>
              </div>
            ))}
          </div>

          {/* Additional Info */}
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <Icon name="Info" size={16} className="text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Price Estimate Notice</p>
                <p>Prices are estimates and may vary based on traffic conditions, fuel costs, and seasonal demand. Final pricing will be confirmed during booking.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteCalculator;