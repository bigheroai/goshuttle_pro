import { supabase } from '../lib/supabase';

class PartnerPayableService {
  // ── PAYABLE ACCOUNTS ──────────────────────────────────────

  async getPayableAccount(driverId) {
    try {
      const { data, error } = await supabase
        ?.from('partner_payable_accounts')
        ?.select('*')
        ?.eq('driver_id', driverId)
        ?.eq('is_active', true)
        ?.single();
      if (error && error?.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching payable account:', error);
      return null;
    }
  }

  async getAllPayableAccounts() {
    try {
      const { data, error } = await supabase
        ?.from('partner_payable_accounts')
        ?.select(`
          *,
          user_profiles!partner_payable_accounts_driver_id_fkey(full_name, email, phone),
          partners(name)
        `)
        ?.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all payable accounts:', error);
      return [];
    }
  }

  async createPayableAccount(driverId, accountData = {}) {
    try {
      const { data, error } = await supabase
        ?.from('partner_payable_accounts')
        ?.insert([{
          driver_id: driverId,
          partner_id: accountData?.partnerId || null,
          account_name: accountData?.accountName || 'Driver Payable Account',
          driver_rate_type: accountData?.rateType || 'percentage',
          driver_rate_value: accountData?.rateValue || 0.80,
        }])
        ?.select()
        ?.single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating payable account:', error);
      throw error;
    }
  }

  async updatePayableAccount(accountId, updates) {
    try {
      const { data, error } = await supabase
        ?.from('partner_payable_accounts')
        ?.update({ ...updates, updated_at: new Date()?.toISOString() })
        ?.eq('id', accountId)
        ?.select()
        ?.single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating payable account:', error);
      throw error;
    }
  }

  // ── PAYABLE LEDGER ────────────────────────────────────────

  async getLedgerEntries(payableAccountId, { limit = 50, offset = 0 } = {}) {
    try {
      const { data, error } = await supabase
        ?.from('partner_payable_ledger')
        ?.select('*')
        ?.eq('payable_account_id', payableAccountId)
        ?.order('posted_at', { ascending: false })
        ?.range(offset, offset + limit - 1);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payable ledger:', error);
      return [];
    }
  }

  async postPayment(payableAccountId, amount, description = '', postedBy = null) {
    try {
      const { data: account } = await supabase
        ?.from('partner_payable_accounts')
        ?.select('current_balance')
        ?.eq('id', payableAccountId)
        ?.single();

      const currentBalance = parseFloat(account?.current_balance || 0);
      const paymentAmount = parseFloat(amount);
      const newBalance = Math.max(0, currentBalance - paymentAmount);

      const { data, error } = await supabase
        ?.from('partner_payable_ledger')
        ?.insert([{
          payable_account_id: payableAccountId,
          entry_type: 'payment',
          amount: paymentAmount,
          running_balance: newBalance,
          description: description || 'Payment disbursed',
          posted_by: postedBy,
          posted_at: new Date()?.toISOString(),
        }])
        ?.select()
        ?.single();
      if (error) throw error;

      // Update account
      await supabase
        ?.from('partner_payable_accounts')
        ?.update({
          current_balance: newBalance,
          total_paid: supabase?.rpc ? undefined : undefined,
          updated_at: new Date()?.toISOString(),
        })
        ?.eq('id', payableAccountId);

      // Also update total_paid separately
      await supabase?.rpc('increment_partner_total_paid', {
        account_id: payableAccountId,
        pay_amount: paymentAmount,
      })?.catch(() => {
        // Fallback: just update balance
      });

      return data;
    } catch (error) {
      console.error('Error posting payment:', error);
      throw error;
    }
  }

  async getPayableSummary() {
    try {
      const { data, error } = await supabase
        ?.from('partner_payable_accounts')
        ?.select(`
          id, account_name, current_balance, total_earned, total_paid, driver_rate_value, driver_rate_type,
          user_profiles!partner_payable_accounts_driver_id_fkey(full_name, email)
        `)
        ?.eq('is_active', true)
        ?.order('current_balance', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payable summary:', error);
      return [];
    }
  }

  async getRecentEarnings(payableAccountId, days = 30) {
    try {
      const since = new Date();
      since?.setDate(since?.getDate() - days);
      const { data, error } = await supabase
        ?.from('partner_payable_ledger')
        ?.select('*')
        ?.eq('payable_account_id', payableAccountId)
        ?.eq('entry_type', 'trip_earning')
        ?.gte('posted_at', since?.toISOString())
        ?.order('posted_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent earnings:', error);
      return [];
    }
  }
}

export default new PartnerPayableService();
