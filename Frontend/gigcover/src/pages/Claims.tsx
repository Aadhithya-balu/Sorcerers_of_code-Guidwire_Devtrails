import React, { useState } from 'react';
import { FileText, CheckCircle2, Clock, XCircle, Search, ShieldAlert } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useClaims } from '@/hooks/use-api';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDateTime, cn } from '@/utils/helpers';

const MOCK_TEST_CLAIM = {
  id: 'CLM-MOCK-001',
  status: 'Paid',
  date: new Date().toISOString(),
  disruptionType: 'Heavy Rain',
  zone: 'Demo Zone',
  payout: 420,
  fraudScore: 18,
  fraudFlags: [],
  fraudDescription: 'Low-risk pattern in all fraud layers.',
  riskScore: 28,
  triggerEvidence: {
    weatherData: { rainfall: 72, aqi: 88, temperature: 26 },
    activityData: { deliveriesCompleted: 5 },
  },
  payoutMethod: 'UPI',
  payoutDate: new Date().toISOString(),
  approvalNotes: 'Mock test claim generated for user validation.',
};

export default function Claims() {
  const { user } = useAuth();
  const defaultUserEmail = import.meta.env.VITE_DEFAULT_USER_EMAIL || 'rajesh@swiggy.com';
  const userIdentifier = {
    userId: user?.backendUserId,
    email: user?.email || defaultUserEmail,
  };
  const { data: apiClaims = [], isLoading } = useClaims(userIdentifier);
  const [query, setQuery] = useState('');
  const claims = apiClaims.length > 0 ? apiClaims : [MOCK_TEST_CLAIM];

  const summary = {
    total: claims.length,
    approved: claims.filter(c => c.status === 'Approved' || c.status === 'Paid').length,
    pending: claims.filter(c => c.status === 'Pending').length,
    rejected: claims.filter(c => c.status === 'Rejected').length,
  };

  const filtered = claims.filter(c =>
    !query ||
    c.id.toLowerCase().includes(query.toLowerCase()) ||
    c.zone?.toLowerCase().includes(query.toLowerCase()) ||
    c.disruptionType?.toLowerCase().includes(query.toLowerCase())
  );

  const statusConfig = {
    Approved: { icon: CheckCircle2, cls: 'bg-green-900/30 text-green-300 border-green-800/40', dot: 'bg-green-500' },
    Paid: { icon: CheckCircle2, cls: 'bg-green-900/30 text-green-300 border-green-800/40', dot: 'bg-green-500' },
    Pending: { icon: Clock, cls: 'bg-yellow-900/30 text-yellow-300 border-yellow-800/40', dot: 'bg-yellow-500' },
    Rejected: { icon: XCircle, cls: 'bg-red-900/30 text-red-300 border-red-800/40', dot: 'bg-red-500' },
  };

  return (
    <MobileLayout title="Claims">
      <div className="px-4 py-4 space-y-4">

        {/* Header */}
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Claims History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">100% automated payouts. Zero paperwork.</p>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total', value: summary.total, cls: 'text-foreground', bg: 'bg-card border-card-border' },
            { label: 'Paid', value: summary.approved, cls: 'text-green-400', bg: 'bg-green-900/30 border-green-800/40' },
            { label: 'Pending', value: summary.pending, cls: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-800/40' },
            { label: 'Rejected', value: summary.rejected, cls: 'text-red-400', bg: 'bg-red-900/30 border-red-800/40' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 shadow-sm border border-border/60 text-center`}>
              <p className={`text-xl font-extrabold ${s.cls}`}>{s.value}</p>
              <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by ID, zone or type…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-secondary text-card-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Claims list */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-2xl h-24 animate-pulse border border-card-border" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-2xl p-10 flex flex-col items-center text-center shadow-sm border border-card-border">
            <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="font-semibold text-foreground mb-1">No claims found</p>
            <p className="text-sm text-muted-foreground">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(claim => {
              const cfg = statusConfig[claim.status as keyof typeof statusConfig];
              const Icon = cfg?.icon || CheckCircle2;
              return (
                <div
                  key={claim.id}
                  className="bg-card rounded-2xl shadow-sm border border-card-border p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-mono font-bold text-sm text-foreground">{claim.id}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(claim.date)}</p>
                    </div>
                    <div className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold', cfg?.cls)}>
                      <Icon className="w-3 h-3" />
                      {claim.status}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{claim.disruptionType}</p>
                      <p className="text-xs text-muted-foreground">{claim.zone}</p>
                    </div>
                    <p className={cn('text-lg font-extrabold', claim.payout > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                      {formatCurrency(claim.payout)}
                    </p>
                  </div>
                  <div className="mt-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className={`w-4 h-4 ${claim.fraudScore && claim.fraudScore >= 60 ? 'text-red-500' : claim.fraudScore && claim.fraudScore >= 40 ? 'text-yellow-500' : 'text-green-500'}`} />
                        <span className="text-xs font-semibold text-foreground">6-Layer Fraud Check</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        (claim.fraudScore || 0) >= 60
                          ? 'bg-red-100 text-red-700'
                          : (claim.fraudScore || 0) >= 40
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {claim.fraudScore ?? 0}/100
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {claim.fraudDescription || 'Location, behavior, platform consistency, official data, fraud-ring, and ML anomaly layers were evaluated.'}
                    </p>
                    {claim.fraudFlags && claim.fraudFlags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {claim.fraudFlags.slice(0, 3).map((flag) => (
                          <span key={flag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-card border border-card-border text-muted-foreground">
                            {flag.replaceAll('_', ' ')}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-green-400 mt-2 font-semibold">Passed all layers for straight-through processing.</p>
                    )}
                  </div>
                  <div className="mt-3 rounded-xl border border-card-border bg-secondary/50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground">Why this payout?</p>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        Risk {claim.riskScore ?? 0}/100
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {claim.approvalNotes
                        ? claim.approvalNotes
                        : `Triggered by ${claim.disruptionType || 'disruption event'} in ${claim.zone}.`}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-[10px] text-muted-foreground">
                      <div className="rounded-lg border border-border/60 px-2.5 py-2 bg-muted/40">
                        <p className="font-semibold text-foreground">Rainfall</p>
                        <p>{claim.triggerEvidence?.weatherData?.rainfall ?? 'NA'} mm</p>
                      </div>
                      <div className="rounded-lg border border-border/60 px-2.5 py-2 bg-muted/40">
                        <p className="font-semibold text-foreground">AQI</p>
                        <p>{claim.triggerEvidence?.weatherData?.aqi ?? 'NA'}</p>
                      </div>
                      <div className="rounded-lg border border-border/60 px-2.5 py-2 bg-muted/40">
                        <p className="font-semibold text-foreground">Temperature</p>
                        <p>{claim.triggerEvidence?.weatherData?.temperature ?? 'NA'}°C</p>
                      </div>
                      <div className="rounded-lg border border-border/60 px-2.5 py-2 bg-muted/40">
                        <p className="font-semibold text-foreground">Deliveries</p>
                        <p>{claim.triggerEvidence?.activityData?.deliveriesCompleted ?? 'NA'}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Payout Method: {claim.payoutMethod || 'Pending'}</span>
                      <span>
                        {claim.payoutDate ? `Paid ${formatDateTime(claim.payoutDate)}` : 'Awaiting payout'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="h-2" />
      </div>
    </MobileLayout>
  );
}
