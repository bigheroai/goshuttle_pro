import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { loyaltyService } from '../../../utils/loyaltyService';

const LoyaltyRewards = ({ loyaltyData = {} }) => {
  const { user, userProfile } = useAuth();
  const [pointsHistory, setPointsHistory] = useState([]);
  const [membershipBenefits, setMembershipBenefits] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);

  // Load loyalty data when component mounts
  useEffect(() => {
    if (user?.id) {
      loadLoyaltyData();
    }
  }, [user?.id]);

  // Subscribe to loyalty updates
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = loyaltyService?.subscribeLoyaltyUpdates(user?.id, (update) => {
      if (update?.type === 'points_transaction') {
        loadPointsHistory();
      }
    });

    return unsubscribe;
  }, [user?.id]);

  const loadLoyaltyData = async () => {
    setLoading(true);
    try {
      // Load points history and membership benefits in parallel
      const [historyResponse, benefitsResponse] = await Promise.all([
        loyaltyService?.getPointsHistory(user?.id, 10),
        loyaltyService?.getAllMembershipBenefits()
      ]);

      if (historyResponse?.data) {
        setPointsHistory(historyResponse?.data);
      }

      if (benefitsResponse?.data) {
        setMembershipBenefits(benefitsResponse?.data);
      }
    } catch (error) {
      console.error('Error loading loyalty data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPointsHistory = async () => {
    if (!user?.id) return;
    
    const { data } = await loyaltyService?.getPointsHistory(user?.id, 10);
    if (data) {
      setPointsHistory(data);
    }
  };

  const handleRedeemPoints = async (points, description) => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { success, error } = await loyaltyService?.redeemPoints(user?.id, points, description);
      
      if (success) {
        await loadPointsHistory();
        // Refresh user profile to get updated points
        window.location?.reload(); // Simple refresh for now
      } else {
        alert(error || 'Failed to redeem points');
      }
    } catch (error) {
      alert('Failed to redeem points');
    } finally {
      setLoading(false);
    }
  };

  // Calculate tier colors
  const tierColors = loyaltyService?.getTierColors(userProfile?.membership_tier || 'bronze');

  // Available rewards based on user's points
  const availableRewards = [
    {
      id: '1',
      title: '₱50 Booking Discount', 
      points: 500,
      description: '₱50 off your next booking',
      icon: 'Gift',
      available: (userProfile?.loyalty_points || 0) >= 500
    },
    {
      id: '2',
      title: '₱100 Booking Discount',
      points: 1000,
      description: '₱100 off your next booking',
      icon: 'Gift',
      available: (userProfile?.loyalty_points || 0) >= 1000
    },
    {
      id: '3',
      title: 'Priority Support',
      points: 750,
      description: '24/7 priority customer support for 1 month',
      icon: 'Headphones',
      available: (userProfile?.loyalty_points || 0) >= 750
    },
    {
      id: '4',
      title: 'Free Cancellation',
      points: 300,
      description: 'Free cancellation on your next 3 bookings',
      icon: 'RefreshCw',
      available: (userProfile?.loyalty_points || 0) >= 300
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Loyalty & Rewards</h2>
        <Button variant="outline" size="sm" onClick={loadLoyaltyData} disabled={loading}>
          <Icon name={loading ? "Loader2" : "RefreshCw"} 
            size={16} 
            className={`mr-2 ${loading ? 'animate-spin' : ''}`} 
          />
          Refresh
        </Button>
      </div>
      {/* Current Status */}
      <div className={`bg-gradient-to-r ${tierColors?.bg} rounded-lg p-4 mb-6 ${tierColors?.border} border`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon name="Crown" size={20} className={tierColors?.accent} />
            <span className={`font-semibold ${tierColors?.text}`}>
              {loyaltyService?.formatTierName(userProfile?.membership_tier)}
            </span>
          </div>
          <span className={`text-lg font-bold ${tierColors?.text}`}>
            {userProfile?.loyalty_points?.toLocaleString() || '0'} pts
          </span>
        </div>
        
        {userProfile?.membership_tier !== 'platinum' && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className={tierColors?.accent}>
                Progress to {loyaltyService?.formatTierName(loyaltyService?.getNextTier(userProfile?.membership_tier))}
              </span>
              <span className={tierColors?.accent}>
                {loyaltyService?.calculatePointsToNextTier(userProfile?.points_lifetime, userProfile?.membership_tier)} points needed
              </span>
            </div>
            <div className="w-full bg-white/50 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-amber-400 to-amber-500 h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${loyaltyService?.calculateTierProgress(userProfile?.points_lifetime, userProfile?.membership_tier)}%` 
                }}
              />
            </div>
          </div>
        )}
      </div>
      {/* Available Rewards */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 mb-4">Available Rewards</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {availableRewards?.map((reward) => (
            <div 
              key={reward?.id} 
              className={`p-4 border rounded-lg ${
                reward?.available 
                  ? 'border-green-200 bg-green-50 hover:bg-green-100 cursor-pointer' :'border-gray-200 bg-gray-50'
              } transition-colors`}
              onClick={() => reward?.available && setSelectedReward(reward)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Icon 
                    name={reward?.icon} 
                    size={20} 
                    className={reward?.available ? 'text-green-600' : 'text-gray-400'} 
                  />
                  <div className="flex-1">
                    <h4 className={`font-medium ${reward?.available ? 'text-gray-900' : 'text-gray-500'}`}>
                      {reward?.title}
                    </h4>
                    <p className={`text-sm ${reward?.available ? 'text-gray-600' : 'text-gray-400'}`}>
                      {reward?.description}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${reward?.available ? 'text-green-600' : 'text-gray-400'}`}>
                  {reward?.points} pts
                </span>
              </div>
              {reward?.available && (
                <Button 
                  size="sm" 
                  className="w-full mt-3"
                  onClick={(e) => {
                    e?.stopPropagation();
                    handleRedeemPoints(reward?.points, `Redeemed: ${reward?.title}`);
                  }}
                  disabled={loading}
                >
                  Redeem
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Recent Activity */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 mb-4">Recent Points Activity</h3>
        <div className="space-y-3">
          {pointsHistory?.length === 0 && !loading && (
            <p className="text-sm text-gray-500 text-center py-4">No points activity yet</p>
          )}
          
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Icon name="Loader2" className="animate-spin text-gray-500" size={20} />
            </div>
          )}
          
          {pointsHistory?.slice(0, 5)?.map((activity) => (
            <div key={activity?.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center gap-3">
                <Icon 
                  name={activity?.transaction_type === 'earned' ? 'Plus' : 'Minus'} 
                  size={16} 
                  className={activity?.transaction_type === 'earned' ? 'text-green-500' : 'text-red-500'} 
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {activity?.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity?.created_at)?.toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span className={`text-sm font-medium ${
                activity?.transaction_type === 'earned' ? 'text-green-600' : 'text-red-600'
              }`}>
                {activity?.transaction_type === 'earned' ? '+' : '-'}{activity?.points_amount} pts
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* Current Tier Benefits */}
      <div>
        <h3 className="font-medium text-gray-900 mb-4">Your Current Benefits</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {membershipBenefits?.[userProfile?.membership_tier]?.map((benefit, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Icon 
                name={
                  benefit?.benefit_type?.includes('discount') ? 'Percent' :
                  benefit?.benefit_type?.includes('support') ? 'Headphones' :
                  benefit?.benefit_type?.includes('points') ? 'Star' :
                  benefit?.benefit_type?.includes('cancellation') ? 'Clock' :
                  'Gift'
                } 
                size={16} 
                className="text-primary" 
              />
              <span className="text-sm text-gray-700">{benefit?.benefit_description}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Redemption Confirmation Modal */}
      {selectedReward && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedReward(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e?.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-4">Confirm Redemption</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to redeem {selectedReward?.points} points for "{selectedReward?.title}"?
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setSelectedReward(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  handleRedeemPoints(selectedReward?.points, `Redeemed: ${selectedReward?.title}`);
                  setSelectedReward(null);
                }}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Redeeming...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoyaltyRewards;