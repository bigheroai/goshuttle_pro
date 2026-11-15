import React from 'react';
import Icon from '../../../components/AppIcon';

const BudgetTracker = ({ budgetData, monthlySpending }) => {
  const limit = budgetData?.limit || 100000;
  const used = budgetData?.used || monthlySpending || 0;
  const spentPercentage = Math.min((used / limit) * 100, 100);
  const remaining = limit - used;

  const getBarColor = () => {
    if (spentPercentage >= 90) return 'bg-red-500';
    if (spentPercentage >= 70) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getStatusLabel = () => {
    if (spentPercentage >= 90) return { text: 'Near limit', color: 'text-red-600', bg: 'bg-red-50', icon: 'AlertTriangle' };
    if (spentPercentage >= 70) return { text: 'Watch spending', color: 'text-amber-600', bg: 'bg-amber-50', icon: 'AlertCircle' };
    return { text: 'On track', color: 'text-green-600', bg: 'bg-green-50', icon: 'CheckCircle2' };
  };

  const status = getStatusLabel();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Monthly Budget</h3>
        <span className={`inline-flex items-center space-x-1 text-xs font-medium px-2 py-1 rounded-full ${status?.bg} ${status?.color}`}>
          <Icon name={status?.icon} size={11} />
          <span>{status?.text}</span>
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>₱{used?.toLocaleString()} spent</span>
          <span>₱{limit?.toLocaleString()} limit</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${getBarColor()}`}
            style={{ width: `${spentPercentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{spentPercentage?.toFixed(1)}% of monthly budget used</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
          <div className="flex items-center space-x-1.5 mb-1">
            <Icon name="TrendingUp" size={13} className="text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Spent</span>
          </div>
          <p className="text-lg font-bold text-blue-900">₱{used?.toLocaleString()}</p>
          <p className="text-xs text-blue-500">This month</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
          <div className="flex items-center space-x-1.5 mb-1">
            <Icon name="Wallet" size={13} className="text-green-600" />
            <span className="text-xs font-medium text-green-700">Remaining</span>
          </div>
          <p className="text-lg font-bold text-green-900">₱{remaining?.toLocaleString()}</p>
          <p className="text-xs text-green-500">Available</p>
        </div>
      </div>
    </div>
  );
};

export default BudgetTracker;