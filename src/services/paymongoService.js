import { supabase } from '../lib/supabase';

class PaymongoService {
  constructor() {
    this._settings = null;
  }

  async getSettings() {
    if (this._settings) return this._settings;
    try {
      // Served by app/api/payments/paymongo/config – secret keys are stripped server-side.
      const response = await fetch('/api/payments/paymongo/config', { cache: 'no-store' });
      if (!response.ok) return null;
      const { settings } = await response.json();
      this._settings = settings || null;
      return this._settings;
    } catch {
      return null;
    }
  }

  // Force refresh settings (call after admin saves)
  clearCache() {
    this._settings = null;
  }

  async isEnabled() {
    const settings = await this.getSettings();
    return settings?.enabled === true;
  }

  async getMode() {
    const settings = await this.getSettings();
    return settings?.mode || 'test';
  }

  async getPublicKey() {
    const settings = await this.getSettings();
    if (!settings) return null;
    const mode = settings?.mode || 'test';
    return mode === 'live' ? settings?.public_key_live : settings?.public_key_test;
  }

  async getSupportedMethods() {
    const settings = await this.getSettings();
    if (!settings?.supported_methods) return [];
    const methods = settings?.supported_methods;
    const result = [];
    if (methods?.gcash) result?.push({ id: 'gcash', name: 'GCash', icon: 'Smartphone', type: 'source' });
    if (methods?.maya) result?.push({ id: 'paymaya', name: 'Maya', icon: 'Smartphone', type: 'source' });
    if (methods?.grab_pay) result?.push({ id: 'grab_pay', name: 'GrabPay', icon: 'Smartphone', type: 'source' });
    if (methods?.card) result?.push({ id: 'card', name: 'Credit/Debit Card', icon: 'CreditCard', type: 'payment_intent' });
    if (methods?.qrph) result?.push({ id: 'qrph', name: 'QR Ph', icon: 'QrCode', type: 'source' });
    if (methods?.dob) result?.push({ id: 'dob', name: 'Online Banking', icon: 'Building2', type: 'source' });
    if (methods?.billease) result?.push({ id: 'billease', name: 'BillEase', icon: 'CreditCard', type: 'source' });
    return result;
  }

  async _checkout(kind, params) {
    const response = await fetch('/api/payments/paymongo/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, ...params }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error || 'PayMongo request failed');
    return result;
  }

  /**
   * Create a PayMongo payment link for the given amount and booking details.
   * Returns { checkoutUrl, paymentLinkId } on success.
   */
  async createPaymentLink({ amountInPHP, description, bookingRef, successUrl, cancelUrl }) {
    return this._checkout('link', { amountInPHP, description, bookingRef, successUrl, cancelUrl });
  }

  /**
   * Create a PayMongo source (for GCash, Maya, GrabPay, etc.)
   * Returns { redirectUrl, sourceId }
   */
  async createSource({ type, amountInPHP, description, bookingRef, successUrl, failedUrl }) {
    return this._checkout('source', { type, amountInPHP, description, bookingRef, successUrl, cancelUrl: failedUrl });
  }

  /**
   * Create a PayMongo payment intent for card payments.
   * Returns { clientKey, paymentIntentId }
   */
  async createPaymentIntent({ amountInPHP, description }) {
    return this._checkout('intent', { amountInPHP, description });
  }

  /**
   * Admin-only refund. Requires the caller's Supabase access token.
   * Returns { refundId }
   */
  async refund({ paymentId, amountInPHP, notes }) {
    const { data } = await supabase?.auth?.getSession();
    const token = data?.session?.access_token;
    const response = await fetch('/api/payments/paymongo/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
      body: JSON.stringify({ paymentId, amountInPHP, notes }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error || 'PayMongo refund API error');
    return result;
  }
}

const paymongoService = new PaymongoService();
export default paymongoService;
