import { supabase } from '../lib/supabase';

const PAYMONGO_API_BASE = 'https://api.paymongo.com/v1';

class PaymongoService {
  constructor() {
    this._settings = null;
  }

  async getSettings() {
    if (this._settings) return this._settings;
    try {
      const { data, error } = await supabase
        ?.from('app_settings')
        ?.select('setting_value')
        ?.eq('setting_key', 'paymongo_gateway_settings')
        ?.single();

      if (error || !data) return null;
      this._settings = data?.setting_value;
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

  async getSecretKey() {
    const settings = await this.getSettings();
    if (!settings) return null;
    const mode = settings?.mode || 'test';
    return mode === 'live' ? settings?.secret_key_live : settings?.secret_key_test;
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

  _authHeader(secretKey) {
    return 'Basic ' + btoa(secretKey + ':');
  }

  /**
   * Create a PayMongo payment link for the given amount and booking details.
   * Returns { checkoutUrl, paymentLinkId } on success.
   */
  async createPaymentLink({ amountInPHP, description, bookingRef, successUrl, cancelUrl }) {
    const settings = await this.getSettings();
    if (!settings?.enabled) throw new Error('PayMongo is not enabled');

    const secretKey = await this.getSecretKey();
    if (!secretKey) throw new Error('PayMongo secret key is not configured');

    const resolvedSuccessUrl = successUrl || settings?.success_url || window.location?.origin + '/booking-confirmed';
    const resolvedCancelUrl = cancelUrl || settings?.cancel_url || window.location?.href;

    const amountInCentavos = Math.round(amountInPHP * 100);

    const payload = {
      data: {
        attributes: {
          amount: amountInCentavos,
          currency: 'PHP',
          description: description || settings?.checkout_description || 'GoShuttle Booking Payment',
          remarks: bookingRef || '',
          redirect: {
            success: resolvedSuccessUrl,
            failed: resolvedCancelUrl,
          },
        },
      },
    };

    const response = await fetch(`${PAYMONGO_API_BASE}/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._authHeader(secretKey),
      },
      body: JSON.stringify(payload),
    });

    const result = await response?.json();

    if (!response?.ok) {
      const errMsg = result?.errors?.[0]?.detail || 'Failed to create PayMongo payment link';
      throw new Error(errMsg);
    }

    return {
      checkoutUrl: result?.data?.attributes?.checkout_url,
      paymentLinkId: result?.data?.id,
      referenceNumber: result?.data?.attributes?.reference_number,
    };
  }

  /**
   * Create a PayMongo source (for GCash, Maya, GrabPay, etc.)
   * Returns { redirectUrl, sourceId }
   */
  async createSource({ type, amountInPHP, description, bookingRef, successUrl, failedUrl }) {
    const settings = await this.getSettings();
    if (!settings?.enabled) throw new Error('PayMongo is not enabled');

    const secretKey = await this.getSecretKey();
    if (!secretKey) throw new Error('PayMongo secret key is not configured');

    const resolvedSuccessUrl = successUrl || settings?.success_url || window.location?.origin + '/booking-confirmed';
    const resolvedFailedUrl = failedUrl || settings?.cancel_url || window.location?.href;

    const amountInCentavos = Math.round(amountInPHP * 100);

    // Map our internal IDs to PayMongo source types
    const sourceTypeMap = {
      gcash: 'gcash',
      paymaya: 'paymaya',
      grab_pay: 'grab_pay',
      qrph: 'qrph',
      dob: 'dob',
      billease: 'billease',
    };

    const paymongoType = sourceTypeMap?.[type] || type;

    const payload = {
      data: {
        attributes: {
          amount: amountInCentavos,
          currency: 'PHP',
          type: paymongoType,
          description: description || settings?.checkout_description || 'GoShuttle Booking Payment',
          redirect: {
            success: resolvedSuccessUrl,
            failed: resolvedFailedUrl,
          },
          billing: {
            name: bookingRef || 'GoShuttle Customer',
          },
        },
      },
    };

    const response = await fetch(`${PAYMONGO_API_BASE}/sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._authHeader(secretKey),
      },
      body: JSON.stringify(payload),
    });

    const result = await response?.json();

    if (!response?.ok) {
      const errMsg = result?.errors?.[0]?.detail || 'Failed to create PayMongo source';
      throw new Error(errMsg);
    }

    return {
      redirectUrl: result?.data?.attributes?.redirect?.checkout_url,
      sourceId: result?.data?.id,
    };
  }

  /**
   * Create a PayMongo payment intent for card payments.
   * Returns { clientKey, paymentIntentId }
   */
  async createPaymentIntent({ amountInPHP, description }) {
    const settings = await this.getSettings();
    if (!settings?.enabled) throw new Error('PayMongo is not enabled');

    const secretKey = await this.getSecretKey();
    if (!secretKey) throw new Error('PayMongo secret key is not configured');

    const amountInCentavos = Math.round(amountInPHP * 100);

    const payload = {
      data: {
        attributes: {
          amount: amountInCentavos,
          currency: 'PHP',
          payment_method_allowed: ['card'],
          description: description || settings?.checkout_description || 'GoShuttle Booking Payment',
          statement_descriptor: settings?.statement_descriptor || 'GOSHUTTLE',
          capture_type: 'automatic',
        },
      },
    };

    const response = await fetch(`${PAYMONGO_API_BASE}/payment_intents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._authHeader(secretKey),
      },
      body: JSON.stringify(payload),
    });

    const result = await response?.json();

    if (!response?.ok) {
      const errMsg = result?.errors?.[0]?.detail || 'Failed to create payment intent';
      throw new Error(errMsg);
    }

    return {
      clientKey: result?.data?.attributes?.client_key,
      paymentIntentId: result?.data?.id,
    };
  }
}

const paymongoService = new PaymongoService();
export default paymongoService;
