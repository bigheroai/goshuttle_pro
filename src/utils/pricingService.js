/**
 * Pricing utility service
 * Enhancement 2: 10-hour base pricing with excess hourly charges
 */

import destinationSettingsService from '../services/destinationSettingsService';

/**
 * Calculate booking price based on hours, rate sheet, and vehicle
 * Base is 10 hours; excess hours are charged at excess_hourly_rate/hr
 * Falls back to admin-configured global excess hourly rate when no rate sheet is matched
 * 
 * @param {Object} vehicle - Vehicle object with dailyRate
 * @param {number} hours - Total hours for the booking
 * @param {Object|null} rateSheet - Rate sheet from database (optional)
 * @param {Object|null} globalRateConfig - Global excess hourly rate config from admin settings
 * @returns {Object} Pricing breakdown
 */
export const calculateBookingPrice = (vehicle, hours = 10, rateSheet = null, globalRateConfig = null) => {
  const totalHours = Math.max(1, hours || 10);
  const baseHours = rateSheet?.base_hours || globalRateConfig?.base_hours || 10;

  // Use rate sheet if available, otherwise fall back to vehicle daily rate
  const baseRate = rateSheet?.base_rate
    ? parseFloat(rateSheet?.base_rate)
    : (vehicle?.dailyRate || vehicle?.daily_rate || 0);

  // Excess hourly rate priority: rate sheet > global admin setting > calculated fallback
  const excessHourlyRate = rateSheet?.excess_hourly_rate
    ? parseFloat(rateSheet?.excess_hourly_rate)
    : globalRateConfig?.rate
      ? parseFloat(globalRateConfig?.rate)
      : Math.round(baseRate / baseHours);

  const fuelSurcharge = rateSheet?.fuel_surcharge
    ? parseFloat(rateSheet?.fuel_surcharge)
    : 0;

  // Calculate excess hours
  const excessHours = Math.max(0, totalHours - baseHours);
  const excessCharge = excessHours * excessHourlyRate;
  const subtotal = baseRate + excessCharge + fuelSurcharge;

  return {
    baseRate,
    baseHours,
    totalHours,
    excessHours,
    excessHourlyRate,
    excessCharge,
    fuelSurcharge,
    subtotal,
    total: Math.round(subtotal)
  };
};

/**
 * Calculate booking price with async global rate config fetch
 * Use this when no rate sheet is available and you want the admin-configured global rate
 */
export const calculateBookingPriceWithGlobalRate = async (vehicle, hours = 10, rateSheet = null) => {
  let globalRateConfig = null;
  if (!rateSheet) {
    try {
      globalRateConfig = await destinationSettingsService?.getGlobalExcessHourlyRate();
    } catch {
      // silently fail, use calculated fallback
    }
  }
  return calculateBookingPrice(vehicle, hours, rateSheet, globalRateConfig);
};

/**
 * Calculate multi-day booking price
 * @param {Object} vehicle - Vehicle object
 * @param {number} days - Number of days
 * @param {Object|null} rateSheet - Rate sheet from database
 * @returns {Object} Pricing breakdown
 */
export const calculateMultiDayPrice = (vehicle, days = 1, rateSheet = null) => {
  const totalDays = Math.max(1, days || 1);

  const dailyRate = rateSheet?.multi_day_rate
    ? parseFloat(rateSheet?.multi_day_rate)
    : (rateSheet?.base_rate
      ? parseFloat(rateSheet?.base_rate)
      : (vehicle?.dailyRate || vehicle?.daily_rate || 0));

  const fuelSurcharge = rateSheet?.fuel_surcharge
    ? parseFloat(rateSheet?.fuel_surcharge)
    : 0;

  const subtotal = (dailyRate * totalDays) + (fuelSurcharge * totalDays);

  return {
    dailyRate,
    totalDays,
    fuelSurcharge,
    subtotal,
    total: Math.round(subtotal)
  };
};

/**
 * Format price for display
 */
export const formatPrice = (amount) => {
  return `₱${(amount || 0)?.toLocaleString()}`;
};

/**
 * Get trip duration in hours from pickup and return datetime
 */
export const getTripHours = (pickupDate, returnDate) => {
  if (!pickupDate || !returnDate) return 10;
  const pickup = new Date(pickupDate);
  const returnDt = new Date(returnDate);
  const diffMs = returnDt - pickup;
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  return Math.max(1, diffHours);
};

export default {
  calculateBookingPrice,
  calculateBookingPriceWithGlobalRate,
  calculateMultiDayPrice,
  formatPrice,
  getTripHours
};
