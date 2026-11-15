import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { supabase } from '../../../lib/supabase';

const TripExtensionPanel = ({ booking, onExtensionAdded }) => {
  const [extraHours, setExtraHours] = useState(1);
  const [excessRate, setExcessRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingRate, setLoadingRate] = useState(true);
  const [extensions, setExtensions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  useEffect(() => {
    if (booking?.id) {
      loadExcessRate();
      loadExtensions();
    }
  }, [booking?.id]);

  const loadExcessRate = async () => {
    try {
      setLoadingRate(true);
      // Try to get rate from rate_sheets based on booking vehicle type
      const { data: rateData } = await supabase
        ?.from('rate_sheets')
        ?.select('excess_hourly_rate, base_hours')
        ?.eq('is_active', true)
        ?.limit(1)
        ?.single();

      if (rateData?.excess_hourly_rate) {
        setExcessRate(Number(rateData?.excess_hourly_rate));
      } else {
        // Fallback to app_settings
        const { data: settingData } = await supabase
          ?.from('app_settings')
          ?.select('setting_value')
          ?.eq('setting_key', 'global_excess_hourly_rate')
          ?.single();
        if (settingData?.setting_value?.rate) {
          setExcessRate(Number(settingData?.setting_value?.rate));
        } else {
          setExcessRate(500); // default fallback
        }
      }
    } catch {
      setExcessRate(500);
    } finally {
      setLoadingRate(false);
    }
  };

  const loadExtensions = async () => {
    try {
      const { data, error } = await supabase
        ?.from('trip_extensions')
        ?.select('*')
        ?.eq('booking_id', booking?.id)
        ?.order('created_at', { ascending: false });
      if (!error) setExtensions(data || []);
    } catch {}
  };

  const extensionCost = extraHours * excessRate;

  const handleSubmitExtension = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase?.from('trip_extensions')?.insert({
        booking_id: booking?.id,
        user_id: user?.id,
        extra_hours: extraHours,
        excess_hourly_rate: excessRate,
        extension_cost: extensionCost,
        payment_method: paymentMethod,
        payment_status: 'pending',
        requested_at: new Date()?.toISOString(),
      });

      if (error) throw error;

      // Update booking extension_total
      const currentExtTotal = Number(booking?.extension_total || 0);
      await supabase
        ?.from('bookings')
        ?.update({
          extension_total: currentExtTotal + extensionCost,
          excess_hours_used: (booking?.excess_hours_used || 0) + extraHours,
          updated_at: new Date()?.toISOString(),
        })
        ?.eq('id', booking?.id);

      alert(`Trip extension of ${extraHours} hour(s) requested. Additional charge: ₱${extensionCost?.toLocaleString()}`);
      setShowForm(false);
      setExtraHours(1);
      loadExtensions();
      onExtensionAdded?.();
    } catch (err) {
      alert('Error requesting extension: ' + err?.message);
    } finally {
      setLoading(false);
    }
  };

  const totalExtensionCost = extensions?.reduce((sum, e) => sum + Number(e?.extension_cost || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <Icon name="Clock" size={16} className="text-orange-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Trip Extension</h3>
            <p className="text-xs text-gray-500">Add extra hours to your booking</p>
          </div>
        </div>
        {!showForm && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
          >
            <Icon name="Plus" size={14} className="mr-1" />
            Extend Trip
          </Button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Rate Info */}
        {loadingRate ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Icon name="Loader2" size={14} className="animate-spin" />
            Loading rate...
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
            <Icon name="Info" size={16} className="text-orange-500 flex-shrink-0" />
            <p className="text-xs text-orange-700">
              Excess/hr rate: <strong>₱{excessRate?.toLocaleString()}/hour</strong>. 
              Extensions are subject to driver and vehicle availability.
            </p>
          </div>
        )}

        {/* Extension Form */}
        {showForm && (
          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Request Trip Extension</h4>

            <div>
              <label className="text-xs font-medium text-gray-700 block mb-2">
                Extra Hours Needed
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setExtraHours(h => Math.max(1, h - 1))}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-gray-700 font-bold"
                >
                  -
                </button>
                <span className="text-lg font-bold text-gray-900 w-8 text-center">{extraHours}</span>
                <button
                  onClick={() => setExtraHours(h => Math.min(12, h + 1))}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-gray-700 font-bold"
                >
                  +
                </button>
                <span className="text-sm text-gray-500">hour{extraHours > 1 ? 's' : ''}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 block mb-2">Payment Method</label>
              <div className="flex gap-2">
                {['cash', 'gcash', 'card']?.map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      paymentMethod === method
                        ? 'bg-primary text-white border-primary' :'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {method?.charAt(0)?.toUpperCase() + method?.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Cost Summary */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Extra hours</span>
                <span>{extraHours} hr{extraHours > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Rate per hour</span>
                <span>₱{excessRate?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-gray-900 pt-1 border-t border-gray-200">
                <span>Additional Charge</span>
                <span className="text-orange-600">₱{extensionCost?.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmitExtension}
                disabled={loading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              >
                {loading ? (
                  <><Icon name="Loader2" size={14} className="animate-spin mr-1" />Processing...</>
                ) : (
                  <>Confirm Extension (₱{extensionCost?.toLocaleString()})</>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Extensions History */}
        {extensions?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Extension History</p>
            <div className="space-y-2">
              {extensions?.map(ext => (
                <div key={ext?.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-xs">
                  <div>
                    <span className="font-medium text-gray-900">+{ext?.extra_hours} hr{ext?.extra_hours > 1 ? 's' : ''}</span>
                    <span className="text-gray-500 ml-2">via {ext?.payment_method}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">₱{Number(ext?.extension_cost)?.toLocaleString()}</p>
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                      ext?.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                      ext?.payment_status === 'pending'? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {ext?.payment_status}
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-xs font-semibold text-gray-900 pt-1 border-t border-gray-200">
                <span>Total Extensions</span>
                <span className="text-orange-600">₱{totalExtensionCost?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripExtensionPanel;
