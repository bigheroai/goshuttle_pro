import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Phone, Mail, CheckCircle } from 'lucide-react';
import { driverRegistrationService } from '../../../services/driverRegistrationService';

export default function FleetSelection({ selectedFleet, onFleetSelect }) {
  const [fleets, setFleets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFleets();
  }, []);

  const loadFleets = async () => {
    try {
      setLoading(true);
      const data = await driverRegistrationService?.getAvailableFleets();
      setFleets(data);
    } catch (err) {
      setError(err?.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3]?.map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Choose Your Fleet</h2>
        <p className="text-gray-600">
          Select which fleet you'd like to join. You can drive for the main GoShuttle fleet or partner with one of our trusted fleet operators.
        </p>
      </div>
      <div className="space-y-4">
        {fleets?.map((fleet) => (
          <div
            key={fleet?.id || 'main'}
            className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all hover:shadow-md ${
              selectedFleet?.id === fleet?.id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            onClick={() => onFleetSelect(fleet)}
          >
            {/* Selection Indicator */}
            {selectedFleet?.id === fleet?.id && (
              <div className="absolute top-4 right-4">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
            )}

            <div className="flex items-start space-x-4">
              {/* Fleet Icon */}
              <div className={`p-3 rounded-lg ${
                fleet?.isMainFleet ? 'bg-blue-100' : 'bg-green-100'
              }`}>
                <Building2 className={`h-6 w-6 ${
                  fleet?.isMainFleet ? 'text-blue-600' : 'text-green-600'
                }`} />
              </div>

              {/* Fleet Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-medium text-gray-900">
                    {fleet?.name}
                  </h3>
                  {fleet?.isMainFleet && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Main Fleet
                    </span>
                  )}
                </div>

                <p className="text-gray-600 mb-3">
                  {fleet?.specialization}
                </p>

                {/* Fleet Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 mr-2" />
                    <span>{fleet?.companyName}</span>
                  </div>

                  {fleet?.contactEmail && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      <span>{fleet?.contactEmail}</span>
                    </div>
                  )}

                  {fleet?.address && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{fleet?.address}</span>
                    </div>
                  )}

                  {fleet?.contactPhone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      <span>{fleet?.contactPhone}</span>
                    </div>
                  )}
                </div>

                {/* Fleet Benefits */}
                {fleet?.isMainFleet && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-md">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Main Fleet Benefits:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Direct employment with GoShuttle</li>
                      <li>• Comprehensive insurance coverage</li>
                      <li>• 24/7 support and maintenance</li>
                      <li>• Career advancement opportunities</li>
                    </ul>
                  </div>
                )}

                {!fleet?.isMainFleet && (
                  <div className="mt-4 p-3 bg-green-50 rounded-md">
                    <h4 className="text-sm font-medium text-green-900 mb-2">Partner Fleet Benefits:</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Higher commission rates</li>
                      <li>• Flexible working arrangements</li>
                      <li>• Direct relationship with fleet operator</li>
                      <li>• Specialized route opportunities</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {selectedFleet && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-800 font-medium">
              Fleet Selected: {selectedFleet?.name}
            </span>
          </div>
          <p className="text-green-700 text-sm mt-1">
            You can proceed to the next step to complete your application.
          </p>
        </div>
      )}
    </div>
  );
}