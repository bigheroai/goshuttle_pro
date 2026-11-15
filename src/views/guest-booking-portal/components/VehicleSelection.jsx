import React from 'react';
import { Car, Users, Check, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import Button from '../../../components/ui/Button';

export default function VehicleSelection({ 
  vehicles, 
  selectedVehicle, 
  onVehicleSelect, 
  bookingData, 
  onNext, 
  onPrev, 
  error 
}) {
  const getVehicleTypeColor = (type) => {
    const colors = {
      van: 'bg-blue-100 text-blue-800',
      shuttle: 'bg-green-100 text-green-800',
      executive_car: 'bg-purple-100 text-purple-800',
      corporate_car: 'bg-gray-100 text-gray-800'
    };
    return colors?.[type] || 'bg-gray-100 text-gray-800';
  };

  const getVehicleTypeLabel = (type) => {
    const labels = {
      van: 'Van',
      shuttle: 'Shuttle',
      executive_car: 'Executive Car',
      corporate_car: 'Corporate Car'
    };
    return labels?.[type] || type;
  };

  const calculateEstimatedCost = (vehicle) => {
    if (!vehicle) return 0;
    
    const baseRate = vehicle?.dailyRate || vehicle?.hourlyRate * 8 || 1500;
    const passengerMultiplier = bookingData?.passengerCount > 4 ? 1.2 : 1;
    const returnTripMultiplier = bookingData?.returnDate ? 2 : 1;
    
    return Math.round(baseRate * passengerMultiplier * returnTripMultiplier);
  };

  const isVehicleSuitable = (vehicle) => {
    return vehicle?.capacity >= bookingData?.passengerCount;
  };

  const filteredVehicles = vehicles?.filter(isVehicleSuitable);

  const handleNext = () => {
    if (!selectedVehicle) {
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Vehicle</h2>
        <p className="text-gray-600">
          Choose the perfect vehicle for your trip to {bookingData?.dropoffLocation}
        </p>
      </div>
      {/* Trip Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Trip Summary</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">From:</span>
            <p className="font-medium">{bookingData?.pickupLocation}</p>
          </div>
          <div>
            <span className="text-gray-600">To:</span>
            <p className="font-medium">{bookingData?.dropoffLocation}</p>
          </div>
          <div>
            <span className="text-gray-600">Date:</span>
            <p className="font-medium">
              {new Date(bookingData.pickupDate)?.toLocaleDateString()} at{' '}
              {new Date(bookingData.pickupDate)?.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>
          <div>
            <span className="text-gray-600">Passengers:</span>
            <p className="font-medium">{bookingData?.passengerCount} people</p>
          </div>
          {bookingData?.returnDate && (
            <div className="md:col-span-2">
              <span className="text-gray-600">Return:</span>
              <p className="font-medium">
                {new Date(bookingData.returnDate)?.toLocaleDateString()} at{' '}
                {new Date(bookingData.returnDate)?.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Vehicle Options */}
      {filteredVehicles?.length === 0 ? (
        <div className="text-center py-8">
          <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Suitable Vehicles Available</h3>
          <p className="text-gray-600">
            No vehicles can accommodate {bookingData?.passengerCount} passengers. 
            Please go back and adjust your passenger count.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredVehicles?.map((vehicle) => {
            const isSelected = selectedVehicle?.id === vehicle?.id;
            const estimatedCost = calculateEstimatedCost(vehicle);
            
            return (
              <div
                key={vehicle?.id}
                className={`
                  border-2 rounded-lg p-6 cursor-pointer transition-all hover:shadow-md
                  ${isSelected 
                    ? 'border-blue-500 bg-blue-50' :'border-gray-200 bg-white hover:border-gray-300'
                  }
                `}
                onClick={() => onVehicleSelect(vehicle)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`
                      p-3 rounded-full
                      ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}
                    `}>
                      <Car className={`
                        w-6 h-6
                        ${isSelected ? 'text-blue-600' : 'text-gray-600'}
                      `} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {vehicle?.make} {vehicle?.model}
                        </h3>
                        <span className={`
                          px-2 py-1 rounded-full text-xs font-medium
                          ${getVehicleTypeColor(vehicle?.type)}
                        `}>
                          {getVehicleTypeLabel(vehicle?.type)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          <span>Up to {vehicle?.capacity} passengers</span>
                        </div>
                        <div>
                          <span className="font-medium">License:</span> {vehicle?.licensePlate}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      ₱{estimatedCost?.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {bookingData?.returnDate ? 'Round trip' : 'One way'}
                    </div>
                    
                    {isSelected && (
                      <div className="flex items-center justify-end mt-2">
                        <Check className="w-5 h-5 text-blue-600 mr-1" />
                        <span className="text-blue-600 font-medium">Selected</span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Vehicle Features */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid md:grid-cols-3 gap-2 text-sm text-gray-600">
                    <div>✓ Air Conditioning</div>
                    <div>✓ Professional Driver</div>
                    <div>✓ Insurance Coverage</div>
                    <div>✓ GPS Tracking</div>
                    <div>✓ 24/7 Support</div>
                    <div>✓ Clean & Sanitized</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Pricing Note */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">Pricing Information</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Prices are estimates based on standard rates</li>
          <li>• Final pricing may vary based on distance, traffic, and special requirements</li>
          <li>• {bookingData?.returnDate ? 'Round trip pricing includes both pickup and return journeys' : 'One-way trip pricing'}</li>
          <li>• All prices include driver fees and basic insurance</li>
        </ul>
      </div>
      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          type="button"
          onClick={onPrev}
          variant="outline"
          className="flex items-center px-6 py-3"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Guest Info
        </Button>
        
        <Button
          type="button"
          onClick={handleNext}
          disabled={!selectedVehicle || filteredVehicles?.length === 0}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Continue to Payment
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
      {!selectedVehicle && filteredVehicles?.length > 0 && (
        <p className="text-center text-gray-500 text-sm">
          Please select a vehicle to continue
        </p>
      )}
    </div>
  );
}