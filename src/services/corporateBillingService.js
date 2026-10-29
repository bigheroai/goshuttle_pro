import { supabase } from '../lib/supabase';

class CorporateBillingService {
  // ── BILLING ACCOUNTS ──────────────────────────────────────

  async getBillingAccount(companyId) {
    try {
      const { data, error } = await supabase
        ?.from('corporate_billing_accounts')
        ?.select('*')
        ?.eq('company_id', companyId)
        ?.eq('is_active', true)
        ?.single();
      if (error && error?.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching billing account:', error);
      return null;
    }
  }

  async createBillingAccount(companyId, accountData = {}) {
    try {
      const { data, error } = await supabase
        ?.from('corporate_billing_accounts')
        ?.insert([{
          company_id: companyId,
          account_name: accountData?.accountName || 'Corporate Account',
          credit_limit: accountData?.creditLimit || 0,
          billing_cycle: accountData?.billingCycle || 'monthly',
          billing_day: accountData?.billingDay || 1,
        }])
        ?.select()
        ?.single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating billing account:', error);
      throw error;
    }
  }

  async getAllBillingAccounts() {
    try {
      const { data, error } = await supabase
        ?.from('corporate_billing_accounts')
        ?.select('*, companies(name, contact_email)')
        ?.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all billing accounts:', error);
      return [];
    }
  }

  // ── LEDGER ENTRIES ────────────────────────────────────────

  async getLedgerEntries(billingAccountId, { limit = 50, offset = 0 } = {}) {
    try {
      const { data, error } = await supabase
        ?.from('corporate_billing_ledger')
        ?.select('*')
        ?.eq('billing_account_id', billingAccountId)
        ?.order('posted_at', { ascending: false })
        ?.range(offset, offset + limit - 1);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      return [];
    }
  }

  async getLedgerByCompany(companyId, { limit = 100, offset = 0 } = {}) {
    try {
      const { data, error } = await supabase
        ?.from('corporate_billing_ledger')
        ?.select('*')
        ?.eq('company_id', companyId)
        ?.order('posted_at', { ascending: false })
        ?.range(offset, offset + limit - 1);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching company ledger:', error);
      return [];
    }
  }

  async postManualEntry(billingAccountId, companyId, entryData) {
    try {
      // Get current balance
      const account = await this.getBillingAccountById(billingAccountId);
      const currentBalance = parseFloat(account?.current_balance || 0);
      const amount = parseFloat(entryData?.amount || 0);
      const newBalance = entryData?.entryType === 'payment'
        ? currentBalance - amount
        : currentBalance + amount;

      const { data, error } = await supabase
        ?.from('corporate_billing_ledger')
        ?.insert([{
          billing_account_id: billingAccountId,
          company_id: companyId,
          entry_type: entryData?.entryType || 'adjustment',
          amount,
          running_balance: newBalance,
          description: entryData?.description,
          reference_number: entryData?.referenceNumber,
          posted_at: new Date()?.toISOString(),
        }])
        ?.select()
        ?.single();
      if (error) throw error;

      // Update account balance
      await supabase
        ?.from('corporate_billing_accounts')
        ?.update({ current_balance: newBalance, updated_at: new Date()?.toISOString() })
        ?.eq('id', billingAccountId);

      return data;
    } catch (error) {
      console.error('Error posting manual entry:', error);
      throw error;
    }
  }

  async getBillingAccountById(id) {
    try {
      const { data, error } = await supabase
        ?.from('corporate_billing_accounts')
        ?.select('*')
        ?.eq('id', id)
        ?.single();
      if (error) throw error;
      return data;
    } catch (error) {
      return null;
    }
  }

  // ── STATEMENTS ────────────────────────────────────────────

  async getStatements(companyId) {
    try {
      const { data, error } = await supabase
        ?.from('corporate_statements')
        ?.select('*')
        ?.eq('company_id', companyId)
        ?.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching statements:', error);
      return [];
    }
  }

  async getAllStatements() {
    try {
      const { data, error } = await supabase
        ?.from('corporate_statements')
        ?.select('*, companies(name)')
        ?.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all statements:', error);
      return [];
    }
  }

  async generateStatement(billingAccountId, companyId, periodStart, periodEnd, createdBy) {
    try {
      // Get ledger entries for period
      const { data: entries, error: ledgerError } = await supabase
        ?.from('corporate_billing_ledger')
        ?.select('*')
        ?.eq('billing_account_id', billingAccountId)
        ?.eq('entry_type', 'trip_charge')
        ?.gte('posted_at', periodStart)
        ?.lte('posted_at', periodEnd);
      if (ledgerError) throw ledgerError;

      const totalAmount = (entries || [])?.reduce((sum, e) => sum + parseFloat(e?.amount || 0), 0);
      const statementNumber = `STMT-${Date.now()}`;

      const dueDate = new Date(periodEnd);
      dueDate?.setDate(dueDate?.getDate() + 30);

      const { data, error } = await supabase
        ?.from('corporate_statements')
        ?.insert([{
          billing_account_id: billingAccountId,
          company_id: companyId,
          statement_number: statementNumber,
          period_start: periodStart,
          period_end: periodEnd,
          total_trips: (entries || [])?.length,
          total_amount: totalAmount,
          balance_due: totalAmount,
          statement_status: 'issued',
          due_date: dueDate?.toISOString()?.split('T')?.[0],
          issued_at: new Date()?.toISOString(),
          created_by: createdBy,
        }])
        ?.select()
        ?.single();
      if (error) throw error;

      // Link ledger entries to this statement
      if (entries?.length > 0) {
        await supabase
          ?.from('corporate_billing_ledger')
          ?.update({ statement_id: data?.id })
          ?.in('id', entries?.map(e => e?.id));
      }

      return data;
    } catch (error) {
      console.error('Error generating statement:', error);
      throw error;
    }
  }

  async updateStatementStatus(statementId, status, amountPaid = null) {
    try {
      const updates = { statement_status: status, updated_at: new Date()?.toISOString() };
      if (status === 'paid') {
        updates.paid_at = new Date()?.toISOString();
      }
      if (amountPaid !== null) {
        updates.amount_paid = amountPaid;
        // Get statement to compute balance
        const { data: stmt } = await supabase
          ?.from('corporate_statements')
          ?.select('total_amount')
          ?.eq('id', statementId)
          ?.single();
        if (stmt) {
          updates.balance_due = Math.max(0, parseFloat(stmt?.total_amount) - parseFloat(amountPaid));
        }
      }
      const { data, error } = await supabase
        ?.from('corporate_statements')
        ?.update(updates)
        ?.eq('id', statementId)
        ?.select()
        ?.single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating statement status:', error);
      throw error;
    }
  }

  // ── BOOKING APPROVALS ─────────────────────────────────────

  async submitForApproval(bookingId, makerId, companyId, notes = '') {
    try {
      // Update booking approval_status
      await supabase
        ?.from('bookings')
        ?.update({
          approval_status: 'pending_approval',
          submitted_for_approval_at: new Date()?.toISOString(),
        })
        ?.eq('id', bookingId);

      // Create approval record
      const { data, error } = await supabase
        ?.from('booking_approvals')
        ?.insert([{
          booking_id: bookingId,
          company_id: companyId,
          maker_id: makerId,
          approval_status: 'pending_approval',
          maker_notes: notes,
          submitted_at: new Date()?.toISOString(),
        }])
        ?.select()
        ?.single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error submitting for approval:', error);
      throw error;
    }
  }

  async getPendingApprovals(companyId) {
    try {
      const { data, error } = await supabase
        ?.from('booking_approvals')
        ?.select(`
          *,
          bookings(id, pickup_location, dropoff_location, pickup_date, total_cost, status, booking_code, vehicle_id, vehicles(name)),
          user_profiles!booking_approvals_maker_id_fkey(full_name, email, department)
        `)
        ?.eq('company_id', companyId)
        ?.eq('approval_status', 'pending_approval')
        ?.order('submitted_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return [];
    }
  }

  async getAllPendingApprovals() {
    try {
      const { data, error } = await supabase
        ?.from('booking_approvals')
        ?.select(`
          *,
          bookings(id, pickup_location, dropoff_location, pickup_date, total_cost, status, booking_code),
          user_profiles!booking_approvals_maker_id_fkey(full_name, email),
          companies(name)
        `)
        ?.eq('approval_status', 'pending_approval')
        ?.order('submitted_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all pending approvals:', error);
      return [];
    }
  }

  async approveBooking(approvalId, bookingId, approverId, notes = '') {
    try {
      await supabase
        ?.from('booking_approvals')
        ?.update({
          approval_status: 'approved',
          approver_id: approverId,
          approver_notes: notes,
          decided_at: new Date()?.toISOString(),
          updated_at: new Date()?.toISOString(),
        })
        ?.eq('id', approvalId);

      const { data, error } = await supabase
        ?.from('bookings')
        ?.update({
          approval_status: 'approved',
          approver_id: approverId,
          approved_at: new Date()?.toISOString(),
          approval_notes: notes,
          status: 'confirmed',
        })
        ?.eq('id', bookingId)
        ?.select()
        ?.single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error approving booking:', error);
      throw error;
    }
  }

  async rejectBooking(approvalId, bookingId, approverId, notes = '') {
    try {
      await supabase
        ?.from('booking_approvals')
        ?.update({
          approval_status: 'rejected',
          approver_id: approverId,
          approver_notes: notes,
          decided_at: new Date()?.toISOString(),
          updated_at: new Date()?.toISOString(),
        })
        ?.eq('id', approvalId);

      const { data, error } = await supabase
        ?.from('bookings')
        ?.update({
          approval_status: 'rejected',
          approver_id: approverId,
          approval_notes: notes,
          status: 'cancelled',
        })
        ?.eq('id', bookingId)
        ?.select()
        ?.single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error rejecting booking:', error);
      throw error;
    }
  }
}

export default new CorporateBillingService();
