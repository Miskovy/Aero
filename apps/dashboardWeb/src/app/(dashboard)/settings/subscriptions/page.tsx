'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { paymentsService, PaymentTransaction, PaymentConfig } from '@/services/api/payments.service';
import { plansService, Plan, DEFAULT_PLANS } from '@/services/api/plans.service';
import { orgsService } from '@/services/api/orgs.service';
import { Organization } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import CustomSelect from '@/components/CustomSelect';

function SubscriptionsContent() {
  const searchParams = useSearchParams();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [, setConfig] = useState<PaymentConfig | null>(null);

  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [, setRefundLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Check URL parameters for payment return status or orgId preselection
  useEffect(() => {
    const status = searchParams.get('status');
    const sessionId = searchParams.get('session_id');
    const isMock = searchParams.get('mock');
    const orgIdParam = searchParams.get('orgId');

    if (orgIdParam) {
      setSelectedOrgId(orgIdParam);
    }

    if (status === 'success') {
      setNotification({
        type: 'success',
        message: isMock
          ? `[XPay Test Mode] Payment checkout complete! Session: ${sessionId}`
          : `Payment successful! Your organization plan has been updated. Session: ${sessionId}`,
      });
    } else if (status === 'cancelled') {
      setNotification({
        type: 'info',
        message: 'Checkout session was cancelled.',
      });
    }
  }, [searchParams]);

  // Load organizations, payment config, and available plans from API
  const initBillingData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get organizations
      const orgList = await orgsService.list().catch(() => []);
      if (orgList && orgList.length > 0) {
        setOrgs(orgList);
        const orgIdParam = searchParams.get('orgId');
        if (orgIdParam && orgList.some(o => o.id === orgIdParam)) {
          setSelectedOrgId(orgIdParam);
        } else if (!selectedOrgId) {
          setSelectedOrgId(orgList[0].id);
        }
      } else {
        setOrgs([]);
      }

      // 2. Get payment config
      const paymentConfig = await paymentsService.getConfig().catch(() => ({
        provider: 'xpay',
        configured: true,
        publishableKey: 'pk_test_demo',
        currency: 'USD',
        supportedMethods: ['card', 'valu', 'fawry', 'meeza'],
      }));
      setConfig(paymentConfig);

      // 3. Query available plans from backend API
      const planList = await plansService.getAll().catch(() => DEFAULT_PLANS);
      setPlans(planList.length > 0 ? planList : DEFAULT_PLANS);
    } catch (err) {
      console.warn('Billing initialization warning:', err);
    } finally {
      setLoading(false);
    }
  }, [searchParams, selectedOrgId]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) initBillingData();
    });
    return () => { active = false; };
  }, [initBillingData]);

  // Load transactions when selected organization changes
  const fetchTransactions = useCallback(async (orgId: string) => {
    if (!orgId) return;
    try {
      const history = await paymentsService.getHistory(orgId).catch(() => []);
      setTransactions(history);
    } catch {
      setTransactions([]);
    }
  }, []);

  useEffect(() => {
    if (selectedOrgId) {
      fetchTransactions(selectedOrgId);
    }
  }, [selectedOrgId, fetchTransactions]);

  // Handle XPay Checkout session trigger for upgrades or changing plans
  const handleUpgrade = async (plan: Plan) => {
    if (!selectedOrgId) {
      setNotification({ type: 'error', message: 'Please select an organization first.' });
      return;
    }

    setCheckoutLoading(plan.id);
    setNotification(null);

    try {
      const res = await paymentsService.createCheckoutSession(
        selectedOrgId,
        plan.id,
        window.location.origin
      );

      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned from XPay');
      }
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to initiate XPay checkout session. Please try again.',
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Handle Refund
  const handleRefund = async (transactionId: string) => {
    if (!confirm('Are you sure you want to refund this transaction via XPay?')) return;
    setRefundLoading(transactionId);
    try {
      await paymentsService.refund(transactionId);
      setNotification({ type: 'success', message: 'Refund successfully processed via XPay.' });
      fetchTransactions(selectedOrgId);
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to process refund.',
      });
    } finally {
      setRefundLoading(null);
    }
  };

  const currentOrg = orgs.find((o) => o.id === selectedOrgId);

  // Sort plans by price ascending
  const sortedPlans = [...plans].sort((a, b) => (a.price || 0) - (b.price || 0));

  // Determine current active plan index
  const findCurrentPlanIndex = (): number => {
    if (!currentOrg) return 0;
    
    // 1. Direct plan_id match
    if (currentOrg.plan_id) {
      const matchedIdx = sortedPlans.findIndex(p => p.id === currentOrg.plan_id);
      if (matchedIdx !== -1) return matchedIdx;
    }

    // 2. Name match with org.plan or org.tier
    const orgTierStr = (currentOrg.tier || currentOrg.plan || '').toLowerCase();
    if (orgTierStr) {
      const matchedIdx = sortedPlans.findIndex(p => {
        const pName = p.name.toLowerCase();
        return orgTierStr.includes(pName) || pName.includes(orgTierStr);
      });
      if (matchedIdx !== -1) return matchedIdx;
    }

    // Default to the first plan (Free Tier)
    return 0;
  };

  const activePlanIndex = findCurrentPlanIndex();
  const activePlanName = sortedPlans[activePlanIndex]?.name || currentOrg?.tier || 'Developer Tier';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Settings Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <Link
          href="/settings"
          className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#88909c] hover:text-[#f3f0ea] hover:bg-[#161a22] transition-colors"
        >
          API Keys
        </Link>
        <Link
          href="/settings/webhooks"
          className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#88909c] hover:text-[#f3f0ea] hover:bg-[#161a22] transition-colors"
        >
          Webhooks
        </Link>
        <Link
          href="/settings/subscriptions"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30 shadow-xs"
        >
          Subscriptions &amp; XPay
        </Link>
      </div>

      {/* Top Header */}
      <PageHeader
        title="Subscriptions &amp; Billing"
        description="Manage workspace subscription plans, infrastructure tier quotas"
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#88909c] font-medium hidden sm:inline">Active Org:</span>
            <div className="w-56">
              {orgs.length > 0 ? (
                <CustomSelect
                  value={selectedOrgId}
                  onChange={(val) => setSelectedOrgId(val)}
                  options={orgs.map((o) => ({
                    value: o.id,
                    label: o.name,
                  }))}
                />
              ) : (
                <Link href="/organizations">
                  <Button size="sm" variant="primary">
                    + Create Org First
                  </Button>
                </Link>
              )}
            </div>
          </div>
        }
      />

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center justify-between transition-all ${
            notification.type === 'success'
              ? 'bg-[#10b981]/12 border-[#10b981]/30 text-[#34d399]'
              : notification.type === 'error'
              ? 'bg-[#ef4444]/12 border-[#ef4444]/30 text-[#f87171]'
              : 'bg-[#38bdf8]/12 border-[#38bdf8]/30 text-[#38bdf8]'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-xs opacity-70 hover:opacity-100 underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Plan Cards Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#f3f0ea] tracking-tight font-title">Available Subscription Plans</h3>
            <p className="text-xs text-[#88909c]">Select a plan tier calibrated for your organization compute demand.</p>
          </div>
          {currentOrg && (
            <span className="text-xs text-[#88909c]">
              Current Tier: <strong className="text-[#38bdf8]">{activePlanName}</strong>
            </span>
          )}
        </div>

        {loading ? (
          <LoadingSkeleton count={3} height="h-64" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {sortedPlans.map((plan, planIdx) => {
              const isZeroCost = (plan.price || 0) === 0;
              const isCurrent = planIdx === activePlanIndex;
              const isLowerTier = planIdx < activePlanIndex;
              const isHigherTier = planIdx > activePlanIndex;

              return (
                <Card
                  key={plan.id}
                  className={`relative flex flex-col justify-between transition-all duration-200 border ${
                    isCurrent
                      ? 'border-[#38bdf8]/45 bg-[#161a22]/95 shadow-lg shadow-[#38bdf8]/5'
                      : 'border-white/[0.07] bg-[#11141a]/90 hover:border-white/[0.14]'
                  }`}
                >
                  <CardBody className="p-6 flex flex-col justify-between h-full space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-base font-bold text-[#f3f0ea] font-title">{plan.name}</h4>
                          <p className="text-xs text-[#88909c] mt-0.5">
                            {isZeroCost
                              ? 'Free starter tier with zero cost'
                              : 'Billed monthly'}
                          </p>
                        </div>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30 font-mono">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="py-2">
                        <span className="text-3xl font-extrabold text-[#f3f0ea] font-title">
                          {isZeroCost ? '0 $' : `${plan.price} $`}
                        </span>
                        {!isZeroCost && <span className="text-xs text-[#88909c] ml-1">/ month</span>}
                      </div>

                      {/* Quota Feature List */}
                      <ul className="space-y-2.5 pt-3 border-t border-white/[0.06] text-xs text-[#ccc8be]">
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-[#10b981] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{plan.is_inf_proj ? 'Unlimited Projects' : `${plan.max_projects || 2} Projects`}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-[#10b981] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{plan.is_inf_nodes ? 'Unlimited Dedicated Nodes' : `${plan.max_nodes || 1} Worker Node`}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-[#10b981] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{plan.is_inf_services ? 'Unlimited Microservices' : `${plan.max_services || 3} Active Services`}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-[#10b981] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{plan.custom_domains ? 'Custom SSL Domains' : 'Subdomains only'}</span>
                        </li>
                      </ul>
                    </div>

                    {/* Button Grading Logic:
                        1. Free tier with zero cost: NO action button
                        2. Current plan: Disabled "Current Plan" button
                        3. Lower plan (in the before): "Change to this"
                        4. Higher plan: "Upgrade"
                    */}
                    <div className="pt-4 border-t border-white/[0.06]">
                      {isZeroCost ? (
                        <div className="py-2.5 px-3 text-center text-xs font-medium rounded-xl border border-white/[0.06] bg-white/[0.02] text-[#88909c]">
                          {isCurrent ? (
                            <span className="text-[#38bdf8] font-semibold">Active Free Tier</span>
                          ) : (
                            <span>Free Tier (Zero Cost)</span>
                          )}
                        </div>
                      ) : isCurrent ? (
                        <Button variant="ghost" disabled className="w-full text-xs opacity-60 cursor-default">
                          Current Plan
                        </Button>
                      ) : isLowerTier ? (
                        <Button
                          variant="secondary"
                          className="w-full text-xs font-medium border border-white/[0.12] hover:border-[#38bdf8]/40 hover:text-[#38bdf8]"
                          isLoading={checkoutLoading === plan.id}
                          onClick={() => handleUpgrade(plan)}
                        >
                          Change to this
                        </Button>
                      ) : isHigherTier ? (
                        <Button
                          variant="primary"
                          className="w-full text-xs font-semibold shadow-sm shadow-[#38bdf8]/10"
                          isLoading={checkoutLoading === plan.id}
                          onClick={() => handleUpgrade(plan)}
                        >
                          Upgrade
                        </Button>
                      ) : null}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Transactions History Table */}
      <div className="space-y-4 pt-4 border-t border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#f3f0ea] tracking-tight font-title">Payment Transactions</h3>
            <p className="text-xs text-[#88909c]">Payment history and settlement records for this organization.</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => fetchTransactions(selectedOrgId)}>
            Refresh Logs
          </Button>
        </div>

        <Card>
          <CardBody className="p-0 overflow-x-auto">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-[#88909c] text-xs">
                No payment transactions recorded for this organization yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-[#161a22]/50 text-[#88909c] font-mono uppercase text-[10.5px]">
                    <th className="p-3.5 pl-5">Date</th>
                    <th className="p-3.5">Plan / Description</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Method</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 pl-5 text-[#88909c] font-mono text-[11px]">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 font-medium text-[#f3f0ea]">
                        {tx.plan?.name || (tx.metadata as { planName?: string })?.planName || 'Plan Subscription'}
                      </td>
                      <td className="p-3.5 font-semibold text-[#f3f0ea] font-mono">
                        {tx.amount} {tx.currency}
                      </td>
                      <td className="p-3.5 text-[#88909c] uppercase font-mono text-[10.5px]">
                        {tx.payment_method}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold font-mono uppercase ${
                            tx.status === 'succeeded'
                              ? 'bg-[#10b981]/15 text-[#34d399] border border-[#10b981]/30'
                              : tx.status === 'pending'
                              ? 'bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30'
                              : tx.status === 'refunded'
                              ? 'bg-[#88909c]/15 text-[#ccc8be] border border-white/[0.1]'
                              : 'bg-[#ef4444]/15 text-[#f87171] border border-[#ef4444]/30'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        {tx.status === 'succeeded' && (
                          <button
                            onClick={() => handleRefund(tx.id)}
                            className="text-[11px] text-[#f87171] hover:underline cursor-pointer"
                          >
                            Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton count={3} height="h-64" />}>
      <SubscriptionsContent />
    </Suspense>
  );
}
