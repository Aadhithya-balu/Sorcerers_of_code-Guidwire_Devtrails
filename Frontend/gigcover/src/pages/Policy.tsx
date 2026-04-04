import React, { useEffect, useState } from 'react';
import {
  ShieldCheck, CheckCircle2, Download,
  History, Calendar, Hash, Zap, Shield, Star, CreditCard, BadgeIndianRupee
} from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { usePolicy, useCreatePaymentOrder, useVerifyPayment, useRiskSnapshot } from '@/hooks/use-api';
import { api } from '@/services/api';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';

type Plan = 'standard' | 'premium';

type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const PLANS = {
  standard: {
    name: 'Standard Plan',
    icon: ShieldCheck,
    basePremium: 30,
    coverage: 1200,
    activeColor: 'border-blue-500 bg-blue-900/30 dark:bg-blue-900/40',
    badgeColor: 'bg-blue-900/40 text-blue-300',
    btnColor: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600',
    tag: 'Dynamic ₹24-48',
    features: ['Model-calculated premium', 'Monsoon + traffic cover', 'Auto claim pipeline']
  },
  premium: {
    name: 'Premium Plan',
    icon: Star,
    basePremium: 45,
    coverage: 2000,
    activeColor: 'border-primary bg-primary/20 dark:bg-primary/30',
    badgeColor: 'bg-primary/30 text-primary',
    btnColor: 'bg-primary hover:bg-primary/90',
    tag: 'Dynamic ₹36-50 max',
    features: ['Higher coverage', 'Priority automation', 'Advanced disruption coverage']
  },
};

const backendPlanToLocal = (plan?: string | null): Plan | null => {
  if (!plan) return null;
  const normalized = plan.toUpperCase();
  if (normalized.includes('BASIC')) return 'standard';
  if (normalized.includes('PREMIUM')) return 'premium';
  return 'standard';
};

export default function Policy() {
  const { user, updateUser } = useAuth();
  const defaultUserEmail = import.meta.env.VITE_DEFAULT_USER_EMAIL || 'rajesh@swiggy.com';
  const userIdentifier = {
    userId: user?.backendUserId,
    email: user?.email || defaultUserEmail,
  };
  const { data: policies = [] } = usePolicy(userIdentifier);
  const { data: riskSnapshot } = useRiskSnapshot(userIdentifier);
  const createPaymentOrderMutation = useCreatePaymentOrder();
  const verifyPaymentMutation = useVerifyPayment();
  const policy = policies[0];

  const effectiveCurrentPlan = backendPlanToLocal(policy?.plan) || backendPlanToLocal(user?.activePlan) || null;
  const [selectedPlan, setSelectedPlan] = useState<Plan>(effectiveCurrentPlan || 'standard');
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [lastOrderAmount, setLastOrderAmount] = useState<number | null>(null);
  const [dynamicPremium, setDynamicPremium] = useState<number | null>(null);
  const [planPremiums, setPlanPremiums] = useState<Record<Plan, number | null>>({
    standard: null,
    premium: null,
  });

  useEffect(() => {
    if (effectiveCurrentPlan) setSelectedPlan(effectiveCurrentPlan);
  }, [effectiveCurrentPlan]);

  useEffect(() => {
    let isCancelled = false;

    const fetchPlanQuotes = async () => {
      if (!user?.backendUserId) {
        setPlanPremiums({ standard: null, premium: null });
        setDynamicPremium(null);
        return;
      }

      try {
        const [standardQuote, premiumQuote] = await Promise.all([
          api.getPremiumQuote({
            userId: user.backendUserId,
            plan: 'standard',
            overallRisk: riskSnapshot?.overallRisk,
          }),
          api.getPremiumQuote({
            userId: user.backendUserId,
            plan: 'premium',
            overallRisk: riskSnapshot?.overallRisk,
          }),
        ]);

        if (isCancelled) {
          return;
        }

        const nextPremiums = {
          standard: Number(standardQuote?.weeklyPremium) || null,
          premium: Number(premiumQuote?.weeklyPremium) || null,
        };

        setPlanPremiums(nextPremiums);
        setDynamicPremium(nextPremiums[selectedPlan]);
      } catch {
        if (isCancelled) {
          return;
        }
        setPlanPremiums({ standard: null, premium: null });
        setDynamicPremium(null);
      }
    };

    void fetchPlanQuotes();

    return () => {
      isCancelled = true;
    };
  }, [riskSnapshot?.overallRisk, user?.backendUserId, selectedPlan]);

  const handleDownloadPolicy = () => {
    if (!policy) {
      toast({
        title: 'No Active Policy',
        description: 'Activate a plan first to download the policy document.',
        variant: 'destructive',
      });
      return;
    }

    if (paymentStatus !== 'PAID') {
      toast({
        title: 'Payment Required',
        description: 'Complete payment to download the policy document.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const policyData = {
        policyId: policy?.id || 'GC-' + Date.now(),
        customerName: user?.name || 'User',
        email: user?.email,
        phone: user?.phone,
        plan: policy?.plan || selectedPlan,
        weeklyPremium: policy?.weeklyPremium || dynamicPremium || 0,
        coverageAmount: policy?.coverageAmount || 0,
        startDate: policy?.startDate ? new Date(policy.startDate).toLocaleDateString() : new Date().toLocaleDateString(),
        expiryDate: policy?.expiryDate ? new Date(policy.expiryDate).toLocaleDateString() : 'N/A',
        paymentStatus: paymentStatus,
        generatedDate: new Date().toLocaleDateString(),
      };

      // Generate PDF content as text
      const pdfContent = `
Policy Document
===============================
Generated: ${policyData.generatedDate}

POLICY DETAILS
Customer Name: ${policyData.customerName}
Email: ${policyData.email}
Phone: ${policyData.phone}

COVERAGE INFORMATION
Policy ID: ${policyData.policyId}
Plan: ${policyData.plan.toUpperCase()}
Weekly Premium: ₹${policyData.weeklyPremium}
Coverage Amount: ₹${policyData.coverageAmount}
Payment Status: ${policyData.paymentStatus}

VALIDITY PERIOD
Start Date: ${policyData.startDate}
Expiry Date: ${policyData.expiryDate}

TERMS & CONDITIONS
- This policy is valid for 365 days from activation
- Weekly premium is automatically charged on the registered payment method
- Coverage is subject to fraud detection and claim validation
- For claims, contact support at support@rakshitartha.com
- Policy can be renewed before expiry

Generated by RakshitArtha Insurance Platform
===============================
      `;

      // Create blob and download
      const blob = new Blob([pdfContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `RakshitArtha_Policy_${policyData.policyId}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download Successful',
        description: 'Policy document downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Could not generate policy document',
        variant: 'destructive',
      });
    }
  };

  const loadRazorpayCheckout = async () => {
    if (window.Razorpay) return true;
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-razorpay-checkout="true"]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay checkout')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.dataset.razorpayCheckout = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
      document.body.appendChild(script);
    });
    return Boolean(window.Razorpay);
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      const checkoutReady = await loadRazorpayCheckout();
      const RazorpayCheckout = window.Razorpay;
      if (!checkoutReady || !RazorpayCheckout) throw new Error('Razorpay checkout could not be loaded');

      const order = await createPaymentOrderMutation.mutateAsync({
        identifier: userIdentifier,
        selectedPlan,
        overallRisk: riskSnapshot?.overallRisk,
      });

      setLastOrderAmount(order.lockedPayableAmount ?? Math.round(order.amount / 100));

      await new Promise<void>((resolve, reject) => {
        const razorpay = new RazorpayCheckout({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'RakshitArtha',
          description: `${PLANS[selectedPlan].name} weekly protection`,
          order_id: order.orderId,
          handler: async (response: RazorpaySuccessResponse) => {
            try {
              await verifyPaymentMutation.mutateAsync({
                identifier: userIdentifier,
                payload: {
                  policyId: order.policyId,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                },
              });
              updateUser({ activePlan: selectedPlan });
              setActivated(true);
              toast({
                title: 'Payment successful',
                description: `${PLANS[selectedPlan].name} is active. Charged ${formatCurrency(order.lockedPayableAmount ?? Math.round(order.amount / 100))}.`,
              });
              setTimeout(() => setActivated(false), 3000);
              resolve();
            } catch (error) {
              reject(error);
            }
          },
          modal: { ondismiss: () => reject(new Error('Payment was cancelled before completion')) },
          prefill: {
            name: user?.name,
            email: user?.email,
            contact: user?.phone,
          },
          notes: {
            backendUserId: user?.backendUserId || '',
            selectedPlan,
            lockedPayableAmount: String(order.lockedPayableAmount ?? Math.round(order.amount / 100)),
          },
          theme: { color: '#0f766e' },
        });

        razorpay.open();
      });
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Payment could not be completed';
      const message =
        /Razorpay credentials are not configured/i.test(rawMessage)
          ? 'Razorpay is not configured on backend. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Backend/insurance-module/.env and restart backend.'
          : rawMessage;
      toast({
        title: 'Payment failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setActivating(false);
    }
  };

  const currentPlan = effectiveCurrentPlan;
  const paymentStatus = policy?.paymentStatus || 'Pending';
  const isProcessingPayment = activating || createPaymentOrderMutation.isPending || verifyPaymentMutation.isPending;

  const paymentHistory = policy?.billingHistory?.length
    ? policy.billingHistory
    : currentPlan
    ? [{
        cycleStart: policy?.startDate,
        cycleEnd: policy?.nextPaymentDue,
        amount: policy?.weeklyPremium || PLANS[currentPlan].basePremium,
        status: paymentStatus,
        paidAt: policy?.lastPaymentAt,
      }]
    : [];

  const chargePreview = policy?.weeklyPremium || dynamicPremium || lastOrderAmount || planPremiums[selectedPlan] || PLANS[selectedPlan].basePremium;

  return (
    <MobileLayout title="Policy">
      <div className="px-4 py-4 space-y-4">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Your Policy</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Amount charged in Razorpay is backend-locked to your selected plan.</p>
        </div>

        <div>
          <p className="text-sm font-bold text-foreground mb-3">Choose Your Plan</p>
          <div className="space-y-3">
            {(Object.entries(PLANS) as [Plan, typeof PLANS.standard][]).map(([key, plan]) => {
              const isSelected = selectedPlan === key;
              const isActive = currentPlan === key;
              const dynamicPlanPremium = planPremiums[key];
              const displayPremium = dynamicPlanPremium ?? plan.basePremium;
              const Icon = plan.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedPlan(key)}
                  className={cn(
                    'w-full text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.98]',
                    isSelected ? plan.activeColor : 'border-border bg-card'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', plan.badgeColor)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-extrabold text-sm text-foreground">{plan.name}</p>
                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', plan.badgeColor)}>
                          {plan.tag}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-foreground">
                        ₹{displayPremium}
                        <span className="text-xs font-normal text-muted-foreground"> {dynamicPlanPremium !== null ? 'dynamic' : 'base'}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">₹{plan.coverage} coverage</p>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-xs text-foreground/80">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {isActive && (
                    <div className="mt-3 pt-2 border-t border-border/60">
                      <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                        Currently Active
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-card-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <p className="text-sm font-bold text-foreground">Payment & Billing</p>
            </div>
            <span className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full',
              paymentStatus === 'Paid'
                ? 'bg-green-100 text-green-700'
                : paymentStatus === 'Failed'
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700'
            )}>
              {paymentStatus}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Weekly Billing</p>
              <p className="font-extrabold text-foreground mt-1">{formatCurrency(chargePreview)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Next Charge</p>
              <p className="font-extrabold text-foreground mt-1">
                {policy?.nextPaymentDue ? formatDate(policy.nextPaymentDue) : 'After activation'}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Razorpay checkout amount must match backend-locked payable amount for your selected plan.
          </p>
        </div>

        {activated ? (
          <div className="w-full bg-green-50 border-2 border-green-300 rounded-xl py-3.5 flex items-center justify-center gap-2 text-green-700 font-bold text-sm animate-in zoom-in">
            <CheckCircle2 className="w-5 h-5" /> Plan Activated
          </div>
        ) : (
          <button
            onClick={handleActivate}
            disabled={isProcessingPayment || currentPlan === selectedPlan}
            className={cn(
              'w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2',
              currentPlan === selectedPlan
                ? 'bg-muted text-muted-foreground cursor-not-allowed shadow-none'
                : `${PLANS[selectedPlan].btnColor} shadow-primary/20`
            )}
          >
            {isProcessingPayment ? (
              <><Zap className="w-4 h-4 animate-pulse" /> Opening Razorpay...</>
            ) : currentPlan === selectedPlan ? (
              <><CheckCircle2 className="w-4 h-4" /> Already Active</>
            ) : (
              <><BadgeIndianRupee className="w-4 h-4" /> Pay & Activate {PLANS[selectedPlan].name}</>
            )}
          </button>
        )}

        {currentPlan && (
          <div className="bg-card rounded-2xl shadow-sm border border-card-border overflow-hidden">
            <div className="bg-primary/5 border-b border-primary/10 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <p className="text-sm font-bold text-foreground">Active Policy Details</p>
              </div>
              <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200">
                ACTIVE
              </span>
            </div>
            <div className="p-4 space-y-3">
              {[
                { icon: Hash, label: 'Policy ID', value: policy?.id || 'Awaiting backend policy' },
                { icon: Calendar, label: 'Start Date', value: policy ? formatDate(policy.startDate) : 'Not available yet' },
                { icon: CreditCard, label: 'Last Payment', value: policy?.lastPaymentAt ? formatDate(policy.lastPaymentAt) : 'Awaiting first payment' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <row.icon className="w-3.5 h-3.5" />{row.label}
                  </div>
                  <p className="text-sm font-semibold font-mono">{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button 
          onClick={handleDownloadPolicy}
          disabled={!policy || paymentStatus !== 'PAID'}
          className={cn(
            'w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-semibold shadow-sm active:scale-95 transition-all',
            policy && paymentStatus === 'PAID'
              ? 'bg-primary text-primary-foreground border border-primary hover:bg-primary/90 cursor-pointer'
              : 'bg-card border border-card-border text-muted-foreground cursor-not-allowed opacity-50'
          )}
          title={!policy ? 'Activate a plan first' : paymentStatus !== 'PAID' ? 'Complete payment to download policy' : 'Download your policy document'}
        >
          <Download className="w-4 h-4" /> Download Policy Document
        </button>

        <div className="bg-card rounded-2xl shadow-sm border border-card-border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-card-border">
            <History className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-bold text-foreground">Premium Payment History</p>
          </div>
          <div className="divide-y divide-card-border">
            {paymentHistory.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                No payment recorded yet. Complete Razorpay payment to activate weekly billing.
              </div>
            ) : paymentHistory.map((entry, index) => (
              <div key={`${entry.razorpayOrderId || entry.cycleStart || index}`} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">
                    {entry.paidAt
                      ? formatDate(entry.paidAt)
                      : entry.cycleStart
                      ? formatDate(entry.cycleStart)
                      : 'Upcoming cycle'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.cycleEnd ? `Due ${formatDate(entry.cycleEnd)}` : `Week ${paymentHistory.length - index}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">{formatCurrency(entry.amount || chargePreview)}</p>
                  <span className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                    entry.status === 'Paid'
                      ? 'bg-green-100 text-green-700'
                      : entry.status === 'Failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  )}>
                    {entry.status || 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-2" />
      </div>
    </MobileLayout>
  );
}
