import { supabase } from '../lib/supabase';

// Loyalty service for managing points and membership tiers
export const loyaltyService = {
  // Get user's current loyalty status
  async getUserLoyaltyStatus(userId) {
    try {
      const { data, error } = await supabase
        ?.from('user_profiles')
        ?.select(`
          loyalty_points,
          membership_tier,
          points_lifetime,
          tier_updated_at
        `)
        ?.eq('id', userId)
        ?.single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error?.message };
    }
  },

  // Get points transaction history
  async getPointsHistory(userId, limit = 20) {
    try {
      const { data, error } = await supabase
        ?.from('points_transactions')
        ?.select(`
          id,
          transaction_type,
          points_amount,
          description,
          created_at,
          expires_at,
          bookings (
            id,
            pickup_location,
            dropoff_location
          )
        `)
        ?.eq('user_id', userId)
        ?.order('created_at', { ascending: false })
        ?.limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error?.message };
    }
  },

  // Get membership benefits for a tier
  async getMembershipBenefits(tier) {
    try {
      const { data, error } = await supabase
        ?.from('membership_benefits')
        ?.select('*')
        ?.eq('tier', tier)
        ?.eq('is_active', true)
        ?.order('benefit_type');

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error?.message };
    }
  },

  // Get all membership benefits (for comparison)
  async getAllMembershipBenefits() {
    try {
      const { data, error } = await supabase
        ?.from('membership_benefits')
        ?.select('*')
        ?.eq('is_active', true)
        ?.order('tier, benefit_type');

      if (error) throw error;

      // Group benefits by tier
      const benefitsByTier = data?.reduce((acc, benefit) => {
        if (!acc?.[benefit?.tier]) {
          acc[benefit?.tier] = [];
        }
        acc?.[benefit?.tier]?.push(benefit);
        return acc;
      }, {});

      return { data: benefitsByTier, error: null };
    } catch (error) {
      return { data: null, error: error?.message };
    }
  },

  // Redeem points for discount or rewards
  async redeemPoints(userId, pointsToRedeem, description) {
    try {
      const { data, error } = await supabase?.rpc('redeem_points', {
        redeem_user_id: userId,
        points_to_redeem: pointsToRedeem,
        redeem_description: description
      });

      if (error) throw error;
      return { success: data, error: null };
    } catch (error) {
      return { success: false, error: error?.message };
    }
  },

  // Calculate discount based on membership tier
  calculateMembershipDiscount(tier, originalAmount) {
    const discountRates = {
      bronze: 0,
      silver: 0.05, // 5%
      gold: 0.10,   // 10%
      platinum: 0.15 // 15%
    };

    const discountRate = discountRates?.[tier] || 0;
    const discountAmount = originalAmount * discountRate;
    const finalAmount = originalAmount - discountAmount;

    return {
      originalAmount,
      discountRate,
      discountAmount,
      finalAmount,
      savings: discountAmount
    };
  },

  // Get tier requirements
  getTierRequirements() {
    return {
      bronze: { minPoints: 0, maxPoints: 1999 },
      silver: { minPoints: 2000, maxPoints: 4999 },
      gold: { minPoints: 5000, maxPoints: 9999 },
      platinum: { minPoints: 10000, maxPoints: Infinity }
    };
  },

  // Calculate points to next tier
  calculatePointsToNextTier(currentPoints, currentTier) {
    const requirements = this.getTierRequirements();
    
    switch (currentTier) {
      case 'bronze':
        return requirements?.silver?.minPoints - currentPoints;
      case 'silver':
        return requirements?.gold?.minPoints - currentPoints;
      case 'gold':
        return requirements?.platinum?.minPoints - currentPoints;
      case 'platinum':
        return 0; // Already at max tier
      default:
        return requirements?.silver?.minPoints - currentPoints;
    }
  },

  // Get next tier name
  getNextTier(currentTier) {
    const tierHierarchy = {
      bronze: 'silver',
      silver: 'gold',
      gold: 'platinum',
      platinum: 'platinum'
    };
    return tierHierarchy?.[currentTier] || 'silver';
  },

  // Calculate tier progress percentage
  calculateTierProgress(currentPoints, currentTier) {
    const requirements = this.getTierRequirements();
    const tierInfo = requirements?.[currentTier];
    
    if (currentTier === 'platinum') {
      return 100; // Max tier reached
    }

    const tierRange = tierInfo?.maxPoints - tierInfo?.minPoints + 1;
    const progressInTier = currentPoints - tierInfo?.minPoints;
    return Math.min(Math.max((progressInTier / tierRange) * 100, 0), 100);
  },

  // Format tier display name
  formatTierName(tier) {
    const tierNames = {
      bronze: 'Bronze Member',
      silver: 'Silver Member', 
      gold: 'Gold Member',
      platinum: 'Platinum Member'
    };
    return tierNames?.[tier] || 'Member';
  },

  // Get tier color scheme
  getTierColors(tier) {
    const colorSchemes = {
      bronze: {
        bg: 'from-amber-50 to-orange-50',
        border: 'border-amber-200',
        text: 'text-amber-800',
        accent: 'text-amber-600'
      },
      silver: {
        bg: 'from-gray-50 to-slate-50',
        border: 'border-gray-300',
        text: 'text-gray-800',
        accent: 'text-gray-600'
      },
      gold: {
        bg: 'from-yellow-50 to-amber-50',
        border: 'border-yellow-300',
        text: 'text-yellow-800',
        accent: 'text-yellow-600'
      },
      platinum: {
        bg: 'from-indigo-50 to-purple-50',
        border: 'border-indigo-300',
        text: 'text-indigo-800',
        accent: 'text-indigo-600'
      }
    };
    return colorSchemes?.[tier] || colorSchemes?.bronze;
  },

  // Real-time subscription for loyalty updates
  subscribeLoyaltyUpdates(userId, callback) {
    const channel = supabase
      ?.channel(`loyalty_${userId}`)
      ?.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          callback?.({
            type: 'profile_updated',
            data: payload?.new
          });
        }
      )
      ?.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'points_transactions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback?.({
            type: 'points_transaction',
            data: payload?.new
          });
        }
      )
      ?.subscribe();

    return () => supabase?.removeChannel(channel);
  }
};

export default loyaltyService;