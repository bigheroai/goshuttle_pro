import React, { useState, useEffect } from 'react';
import { driverService } from '../../../services/driverService';
import { TrendingUp, Star, Clock, AlertTriangle, Award, DollarSign, Activity, Users } from 'lucide-react';

export default function PerformanceMetrics({ driverId, timeRange = 'week' }) {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({
    totalTrips: 0,
    totalEarnings: 0,
    averageRating: 0,
    averagePunctuality: 0,
    safetyIncidents: 0,
    customerComplaints: 0
  });

  useEffect(() => {
    if (driverId) {
      loadPerformanceMetrics();
    }
  }, [driverId, timeRange]);

  const loadPerformanceMetrics = async () => {
    try {
      setLoading(true);
      setError('');

      const endDate = new Date()?.toISOString()?.split('T')?.[0];
      let startDate;
      
      switch (timeRange) {
        case 'week':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)?.toISOString()?.split('T')?.[0];
          break;
        case 'month':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)?.toISOString()?.split('T')?.[0];
          break;
        case 'quarter':
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)?.toISOString()?.split('T')?.[0];
          break;
        default:
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)?.toISOString()?.split('T')?.[0];
      }

      const data = await driverService?.getPerformance(driverId, startDate, endDate);
      setMetrics(data);

      // Calculate summary
      const totals = data?.reduce((acc, metric) => ({
        totalTrips: acc?.totalTrips + (metric?.tripsCompleted || 0),
        totalEarnings: acc?.totalEarnings + (metric?.totalEarnings || 0),
        averageRating: acc?.averageRating + (metric?.averageRating || 0),
        averagePunctuality: acc?.averagePunctuality + (metric?.punctualityScore || 0),
        safetyIncidents: acc?.safetyIncidents + (metric?.safetyIncidents || 0),
        customerComplaints: acc?.customerComplaints + (metric?.customerComplaints || 0)
      }), {
        totalTrips: 0,
        totalEarnings: 0,
        averageRating: 0,
        averagePunctuality: 0,
        safetyIncidents: 0,
        customerComplaints: 0
      });

      setSummary({
        ...totals,
        averageRating: data?.length > 0 ? totals?.averageRating / data?.length : 0,
        averagePunctuality: data?.length > 0 ? totals?.averagePunctuality / data?.length : 0
      });

    } catch (err) {
      setError(err?.message);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (value, type) => {
    switch (type) {
      case 'rating':
        if (value >= 4.5) return 'text-green-600';
        if (value >= 4.0) return 'text-yellow-600';
        return 'text-red-600';
      case 'punctuality':
        if (value >= 4.5) return 'text-green-600';
        if (value >= 4.0) return 'text-yellow-600';
        return 'text-red-600';
      case 'incidents':
        if (value === 0) return 'text-green-600';
        if (value <= 2) return 'text-yellow-600';
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })?.format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading performance metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">Error loading metrics: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Trips</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.totalTrips}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.totalEarnings)}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <p className={`text-2xl font-bold ${getPerformanceColor(summary?.averageRating, 'rating')}`}>
                {summary?.averageRating?.toFixed(1)}
              </p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Punctuality</p>
              <p className={`text-2xl font-bold ${getPerformanceColor(summary?.averagePunctuality, 'punctuality')}`}>
                {summary?.averagePunctuality?.toFixed(1)}/5
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>
      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-600" />
            Safety & Quality
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Safety Incidents</span>
              <span className={`font-semibold ${getPerformanceColor(summary?.safetyIncidents, 'incidents')}`}>
                {summary?.safetyIncidents}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Customer Complaints</span>
              <span className={`font-semibold ${getPerformanceColor(summary?.customerComplaints, 'incidents')}`}>
                {summary?.customerComplaints}
              </span>
            </div>
            
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Quality Score</span>
                <div className="flex items-center gap-1">
                  <span className={`font-semibold ${getPerformanceColor(summary?.averageRating, 'rating')}`}>
                    {((summary?.averageRating / 5) * 100)?.toFixed(0)}%
                  </span>
                  <div className="w-20 h-2 bg-gray-200 rounded-full ml-2">
                    <div 
                      className={`h-2 rounded-full ${
                        summary?.averageRating >= 4.5 ? 'bg-green-500' : 
                        summary?.averageRating >= 4.0 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${(summary?.averageRating / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Performance Trends
          </h3>
          
          <div className="space-y-4">
            {summary?.totalTrips > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Avg. Earnings per Trip</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(summary?.totalEarnings / summary?.totalTrips)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Trips per Day</span>
                  <span className="font-semibold text-gray-900">
                    {(summary?.totalTrips / Math.max(metrics?.length, 1))?.toFixed(1)}
                  </span>
                </div>
              </>
            )}
            
            <div className="pt-2 border-t border-gray-200">
              <div className="text-sm text-gray-600 mb-2">Overall Performance</div>
              <div className="flex items-center gap-2">
                {summary?.averageRating >= 4.5 && summary?.safetyIncidents === 0 ? (
                  <>
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                      Excellent
                    </span>
                    <Users className="h-4 w-4 text-green-600" />
                  </>
                ) : summary?.averageRating >= 4.0 && summary?.safetyIncidents <= 1 ? (
                  <>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                      Good
                    </span>
                    <Users className="h-4 w-4 text-yellow-600" />
                  </>
                ) : (
                  <>
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                      Needs Improvement
                    </span>
                    <Users className="h-4 w-4 text-red-600" />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Daily Performance Chart */}
      {metrics?.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Performance</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-600">Date</th>
                  <th className="text-right py-2 text-gray-600">Trips</th>
                  <th className="text-right py-2 text-gray-600">Earnings</th>
                  <th className="text-right py-2 text-gray-600">Rating</th>
                  <th className="text-right py-2 text-gray-600">Punctuality</th>
                  <th className="text-right py-2 text-gray-600">Incidents</th>
                </tr>
              </thead>
              <tbody>
                {metrics?.slice(0, 10)?.map((metric, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 text-gray-900">
                      {new Date(metric.tripDate)?.toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right text-gray-900">{metric?.tripsCompleted}</td>
                    <td className="py-3 text-right text-gray-900">{formatCurrency(metric?.totalEarnings)}</td>
                    <td className={`py-3 text-right ${getPerformanceColor(metric?.averageRating, 'rating')}`}>
                      {metric?.averageRating?.toFixed(1)}
                    </td>
                    <td className={`py-3 text-right ${getPerformanceColor(metric?.punctualityScore, 'punctuality')}`}>
                      {metric?.punctualityScore?.toFixed(1)}
                    </td>
                    <td className={`py-3 text-right ${getPerformanceColor(metric?.safetyIncidents, 'incidents')}`}>
                      {metric?.safetyIncidents + metric?.customerComplaints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}