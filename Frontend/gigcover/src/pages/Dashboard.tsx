import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck, Droplets, Wind, Car,
  Sparkles, Target, Calculator, Activity, RefreshCcw, ShieldAlert
} from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { cn, formatCurrency } from '@/utils/helpers';
import {
  useWorkerProfile, usePolicy, useRiskSnapshot, useSimulatePayout, useClaims, useNearbyZones
} from '@/hooks/use-api';
import { useAuth } from '@/context/AuthContext';

function getRiskLabel(score: number) {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

function getRiskColor(score: number) {
  if (score >= 70) return 'bg-red-900/40 dark:bg-red-900/50 text-red-400 dark:text-red-300 border border-red-800/50 dark:border-red-700/60';
  if (score >= 40) return 'bg-yellow-900/40 dark:bg-yellow-900/50 text-yellow-400 dark:text-yellow-300 border border-yellow-800/50 dark:border-yellow-700/60';
  return 'bg-green-900/40 dark:bg-green-900/50 text-green-400 dark:text-green-300 border border-green-800/50 dark:border-green-700/60';
}

function getBarColor(score: number) {
  if (score >= 70) return 'bg-red-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-green-500';
}

function deriveTrustScore({
  profileTrustScore,
  overallRisk,
  claimCount,
}: {
  profileTrustScore: number | null | undefined;
  overallRisk: number | null;
  claimCount: number;
}) {
  if (typeof profileTrustScore === 'number') {
    return Math.max(0, Math.min(100, Math.round(profileTrustScore)));
  }

  const riskPenalty = overallRisk == null ? 10 : Math.round(overallRisk / 5);
  const claimPenalty = claimCount * 4;
  return Math.max(65, Math.min(98, 96 - riskPenalty - claimPenalty));
}

export default function Dashboard() {
  const { user } = useAuth();
  const defaultUserEmail = import.meta.env.VITE_DEFAULT_USER_EMAIL || 'rajesh@swiggy.com';
  const userIdentifier = {
    userId: user?.backendUserId,
    email: user?.email || defaultUserEmail,
  };

  const {
    data: profileData,
    isLoading: profileLoading,
    isError: profileError,
  } = useWorkerProfile(userIdentifier);
  const { data: policies = [], isLoading: policyLoading } = usePolicy(userIdentifier);
  const {
    data: riskSnapshot,
    isLoading: riskLoading,
    isFetching: riskRefreshing,
    isError: riskError,
  } = useRiskSnapshot(userIdentifier);
  const { data: claims = [] } = useClaims(userIdentifier);
  const { data: nearbyZones = [] } = useNearbyZones(userIdentifier);
  const simulateMutation = useSimulatePayout();
  const activePolicy = policies[0];
  const latestClaim = claims[0];

  const profile = profileData
    ? {
        name: user?.name || profileData.name,
        platform: user?.platform || profileData.platform,
        dailyIncome: profileData.dailyIncome,
        zoneType: user?.zoneType || profileData.zoneType,
        trustScore: profileData.trustScore,
        location:
          profileData.location ||
          [user?.city, user?.deliveryZone].filter(Boolean).join(', ') ||
          null,
      }
    : {
        name: user?.name || 'Worker',
        platform: user?.platform || 'Worker',
        dailyIncome: null,
        zoneType: user?.zoneType || null,
        trustScore: null,
        location: [user?.city, user?.deliveryZone].filter(Boolean).join(', ') || null,
      };

  const [simIncome, setSimIncome] = useState(0);
  const [simResult, setSimResult] = useState<{ loss: number; payout: number; disruptionPercent?: number } | null>(null);

  useEffect(() => {
    if (profile.dailyIncome) {
      setSimIncome(profile.dailyIncome);
    }
  }, [profile.dailyIncome]);

  const handleSimulate = async () => {
    const res = await simulateMutation.mutateAsync({
      identifier: userIdentifier,
      dailyIncome: simIncome,
    });
    const disruptionPercent = res.disruptionPercent ?? 0;
    const isSafe =
      (typeof riskPct === 'number' && riskPct < 34) ||
      disruptionPercent <= 0.12;
    setSimResult({
      loss: isSafe ? 0 : res.estimatedLoss,
      payout: isSafe ? 0 : res.payout,
      disruptionPercent,
    });
  };


  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const hasLiveRisk = typeof riskSnapshot?.overallRisk === 'number';
  const riskPct = hasLiveRisk ? Math.round(riskSnapshot.overallRisk as number) : null;
  const riskRatio = riskPct == null ? 'Syncing' : (riskPct / 100).toFixed(2);
  const rainfall = riskSnapshot?.rainfall;
  const aqi = riskSnapshot?.aqi;
  const trafficIndex = riskSnapshot?.trafficIndex;
  const address =
    riskSnapshot?.address ||
    profile.location ||
    profile.zoneType ||
    'your location';
  const trustScore = deriveTrustScore({
    profileTrustScore: profile.trustScore,
    overallRisk: riskPct,
    claimCount: claims.length,
  });
  const optimizedEarnings =
    profile.dailyIncome == null || riskPct == null
      ? null
      : Math.round(profile.dailyIncome * (riskPct >= 70 ? 0.82 : riskPct >= 40 ? 0.92 : 1.05));

  const timeWindows = useMemo(() => {
    if (riskPct == null) {
      return [];
    }

    const values = [
      { time: '6:00 - 7:00 PM', score: Math.max(riskPct - 20, 5) },
      { time: '7:00 - 8:00 PM', score: riskPct },
      { time: '8:00 - 10:00 PM', score: Math.min(riskPct + 10, 95) },
    ];

    return values.map((item) => ({
      ...item,
      label: getRiskLabel(item.score) === 'LOW' ? 'SAFE' : getRiskLabel(item.score) === 'MEDIUM' ? 'MODERATE' : 'HIGH RISK',
      cls:
        item.score >= 70
          ? 'bg-red-900/40 dark:bg-red-900/50 border-red-800/50 dark:border-red-700/60 text-red-400 dark:text-red-300'
          : item.score >= 40
          ? 'bg-yellow-900/40 dark:bg-yellow-900/50 border-yellow-800/50 dark:border-yellow-700/60 text-yellow-400 dark:text-yellow-300'
          : 'bg-green-900/40 dark:bg-green-900/50 border-green-800/50 dark:border-green-700/60 text-green-400 dark:text-green-300',
    }));
  }, [riskPct]);

  const aiTips = riskPct == null
    ? [
        'We are waiting for your live location risk snapshot from the backend.',
        'If you just logged in, this usually updates after the account sync finishes.',
        'Weather, AQI, and route suggestions will change as soon as the refresh call succeeds.',
      ]
    : [
        (rainfall ?? 0) > 40
          ? `Heavy rainfall is active near ${address}. Prefer short-distance orders.`
          : `Rainfall is manageable near ${address}. Longer runs are safer right now.`,
        (aqi ?? 0) > 180
          ? `AQI is high at ${aqi}. Limit exposure and avoid long idle waits on busy roads.`
          : `AQI is at ${aqi}. Outdoor conditions are relatively stable.`,
        (trafficIndex ?? 0) > 2
          ? `Traffic blockages are elevated at ${trafficIndex}/5. Consider switching zones if deliveries slow down.`
          : `Traffic pressure is moderate at ${trafficIndex}/5. Your current zone looks workable.`,
      ];

  const conditions = [
    {
      icon: Droplets,
      label: 'Rainfall',
      value: rainfall == null ? 'Waiting for live weather' : `${rainfall} mm`,
      cls: 'bg-blue-900/40 dark:bg-blue-900/50 text-blue-400 dark:text-blue-300',
      row: 'bg-blue-900/15 dark:bg-blue-900/25 border-blue-800/30 dark:border-blue-700/40',
    },
    {
      icon: Wind,
      label: 'AQI Level',
      value:
        aqi == null
          ? 'Waiting for live AQI'
          : `${aqi} ${aqi > 200 ? '(Very High)' : aqi > 150 ? '(High)' : aqi > 100 ? '(Moderate)' : '(Good)'}`,
      cls: 'bg-yellow-900/40 dark:bg-yellow-900/50 text-yellow-400 dark:text-yellow-300',
      row: aqi != null && aqi > 150 ? 'bg-yellow-900/25 dark:bg-yellow-900/30 border-yellow-800/40 dark:border-yellow-700/50' : 'bg-yellow-900/15 dark:bg-yellow-900/25 border-yellow-800/30 dark:border-yellow-700/40'
    },
    {
      icon: Car,
      label: 'Traffic Index',
      value: trafficIndex == null ? 'Waiting for traffic model' : `${trafficIndex} / 5`,
      cls: 'bg-orange-900/40 dark:bg-orange-900/50 text-orange-400 dark:text-orange-300',
      row: 'bg-orange-900/15 dark:bg-orange-900/25 border-orange-800/30 dark:border-orange-700/40',
    },
  ];

  const assistantStatus =
    riskPct == null ? 'Syncing' : riskPct >= 70 ? 'High Risk' : riskPct >= 40 ? 'Moderate Risk' : 'Low Risk';
  const currentStatus =
    riskPct == null
      ? 'Status: Waiting for live backend snapshot'
      : riskPct >= 70
      ? 'Status: High disruption risk'
      : riskPct >= 40
      ? 'Status: Moderate disruption risk'
      : 'Status: Low disruption risk';

  const liveSourceLabel = riskSnapshot?.dataSource || 'Not Synced';
  const showSyncWarning = !hasLiveRisk || riskError || profileError;

  return (
    <MobileLayout title="RakshitArtha">
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground font-medium">
              {greeting()}, {profile.name.split(' ')[0] || 'Worker'}
            </p>
            <h1 className="text-xl font-extrabold text-foreground">Your Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {address}
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-green-900/40 dark:bg-green-900/50 border border-green-800/50 dark:border-green-700/60 px-2.5 py-1.5 rounded-full">
            <RefreshCcw className={`w-3 h-3 text-green-400 dark:text-green-300 ${riskRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-[11px] font-semibold text-green-400 dark:text-green-300">
              {riskRefreshing ? 'Refreshing' : 'Monitoring On'}
            </span>
          </div>
        </div>

        {showSyncWarning && (
          <div className="bg-yellow-900/25 dark:bg-yellow-900/30 border border-yellow-800/40 dark:border-yellow-700/50 rounded-2xl p-3">
            <p className="text-xs font-semibold text-yellow-300 dark:text-yellow-200">
              Live dashboard sync is incomplete for this account.
            </p>
            <p className="text-xs text-yellow-400 dark:text-yellow-300 mt-1">
              We are not showing shared placeholder values anymore. This view will update when backend profile and live risk refresh both respond for {userIdentifier.email}.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-4 shadow-sm border border-card-border">
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Income</p>
            <p className="text-lg font-extrabold text-card-foreground">
              {profile.dailyIncome == null ? 'Syncing' : formatCurrency(profile.dailyIncome)}
            </p>
            <p className="text-[10px] text-muted-foreground">per day</p>
          </div>

          <div className="bg-card rounded-2xl p-4 shadow-sm border border-card-border">
            <div className="w-8 h-8 bg-blue-500/10 dark:bg-blue-600/20 rounded-xl flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Trust</p>
            <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{trustScore}%</p>
            <p className="text-[10px] text-muted-foreground">risk + claims based</p>
          </div>

          <div className="bg-card rounded-2xl p-4 shadow-sm border border-card-border">
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Premium</p>
            <p className="text-lg font-extrabold text-primary">
              {activePolicy ? formatCurrency(activePolicy.weeklyPremium) : 'No policy'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {activePolicy ? 'per week · ACTIVE' : 'create a policy to insure'}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-4 shadow-sm border border-card-border">
            <div className="w-8 h-8 bg-blue-600/10 dark:bg-blue-500/20 rounded-xl flex items-center justify-center mb-3">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Coverage</p>
            <p className="text-lg font-extrabold text-foreground">
              {activePolicy ? formatCurrency(activePolicy.coverageAmount) : 'No policy'}
            </p>
            <p className="text-[10px] text-muted-foreground">max payout</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-card-border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-card-foreground">Risk Score</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${riskPct == null ? 'bg-muted text-muted-foreground' : getRiskColor(riskPct)}`}>
              {riskPct == null ? 'SYNCING' : getRiskLabel(riskPct)}
            </span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-700 ${riskPct == null ? 'bg-slate-400 dark:bg-slate-600' : getBarColor(riskPct)}`}
              style={{ width: `${riskPct ?? 0}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Low Risk</span>
            <span className="font-bold">{riskRatio}</span>
            <span>High Risk</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Source: {liveSourceLabel}</span>
            <span>
              {riskSnapshot?.updatedAt ? `Updated ${new Date(riskSnapshot.updatedAt).toLocaleTimeString()}` : 'Awaiting first refresh'}
            </span>
          </div>
        </div>

        {latestClaim && (
          <div className="bg-green-900/30 dark:bg-green-900/40 rounded-2xl shadow-sm border border-green-800/40 dark:border-green-700/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-green-300 dark:text-green-200">Latest Claim Update</p>
                <p className="text-xs text-green-400 dark:text-green-300 mt-1">
                  {latestClaim.disruptionType} · {latestClaim.status} · {latestClaim.zone}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold text-green-300 dark:text-green-200">{formatCurrency(latestClaim.payout)}</p>
                <p className="text-[10px] text-green-400 dark:text-green-300">auto payout</p>
              </div>
            </div>
          </div>
        )}

        {latestClaim && (
          <div className={`rounded-2xl shadow-sm border p-4 ${
            (latestClaim.fraudScore || 0) >= 60
              ? 'bg-red-900/30 dark:bg-red-900/40 border-red-800/40 dark:border-red-700/50'
              : (latestClaim.fraudScore || 0) >= 40
              ? 'bg-yellow-900/30 dark:bg-yellow-900/40 border-yellow-800/40 dark:border-yellow-700/50'
              : 'bg-card border-card-border'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className={`w-4 h-4 ${
                  (latestClaim.fraudScore || 0) >= 60
                    ? 'text-red-400 dark:text-red-300'
                    : (latestClaim.fraudScore || 0) >= 40
                    ? 'text-yellow-400 dark:text-yellow-300'
                    : 'text-green-400 dark:text-green-300'
                }`} />
                <div>
                  <p className="text-sm font-bold text-card-foreground">Fraud Status</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {latestClaim.fraudDescription || 'Latest claim passed the fraud screening pipeline.'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold text-card-foreground">{latestClaim.fraudScore ?? 0}/100</p>
                <p className="text-[10px] text-muted-foreground">6-layer check</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-card rounded-2xl shadow-sm border border-card-border p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <div className="flex flex-col">
              <p className="text-sm font-bold text-card-foreground">Nearby Zones (Google Maps)</p>
              <p className="text-[10px] text-muted-foreground">Within 10 km radius</p>
            </div>
          </div>
          {nearbyZones.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3">
              Nearby zones will appear once the backend resolves your location and map data.
            </p>
          ) : (
            <div className="space-y-2">
              {nearbyZones.map((zone) => (
                <div key={`${zone.placeId || zone.zoneName}`} className="flex items-center justify-between gap-3 rounded-xl border border-card-border bg-secondary/30 dark:bg-secondary/50 px-3 py-2.5 hover:border-primary/60 dark:hover:border-primary/70 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                      <p className="text-sm font-semibold text-card-foreground truncate">{zone.zoneName}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">
                      {zone.distanceKm == null ? 'Distance unavailable' : `${zone.distanceKm.toFixed(2)} km away`}
                    </p>
                  </div>
                  <span className={cn(
                    'text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0',
                    zone.riskLabel === 'EXTREME'
                      ? 'bg-red-900/50 dark:bg-red-900/60 text-red-300 dark:text-red-200 border border-red-800/60 dark:border-red-700/70'
                      : zone.riskLabel === 'HIGH'
                      ? 'bg-orange-900/50 dark:bg-orange-900/60 text-orange-300 dark:text-orange-200 border border-orange-800/60 dark:border-orange-700/70'
                      : zone.riskLabel === 'MEDIUM'
                      ? 'bg-yellow-900/50 dark:bg-yellow-900/60 text-yellow-300 dark:text-yellow-200 border border-yellow-800/60 dark:border-yellow-700/70'
                      : 'bg-green-900/50 dark:bg-green-900/60 text-green-300 dark:text-green-200 border border-green-800/60 dark:border-green-700/70'
                  )}>
                    {zone.riskLabel} ({zone.riskScore})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-primary/20 dark:border-primary/30 overflow-hidden">
          <div className="bg-primary/8 dark:bg-primary/15 border-b border-primary/10 dark:border-primary/20 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-card-foreground">Smart Work Assistant</span>
            </div>
            <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase ${riskPct == null ? 'bg-muted text-muted-foreground border-muted/50' : getRiskColor(riskPct)}`}>
              {assistantStatus}
            </span>
          </div>
          <div className="p-4">
            <p className="text-xs text-primary dark:text-primary/80 bg-primary/10 dark:bg-primary/20 px-3 py-2 rounded-xl border border-primary/20 dark:border-primary/30 font-medium mb-4 inline-block">
              {riskPct == null
                ? '"Waiting for live weather and model sync"'
                : riskPct >= 70
                ? '"Reduce exposure and protect income today"'
                : '"Use low-risk windows to improve earnings"'}
            </p>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Time Windows</p>
            <div className="space-y-2 mb-4">
              {timeWindows.length > 0 ? timeWindows.map((w) => (
                <div key={w.time} className={`flex items-center justify-between p-2.5 rounded-xl border ${w.cls.split(' ').slice(0, 2).join(' ')} dark:brightness-110`}>
                  <span className="text-sm font-medium text-foreground dark:text-card-foreground">{w.time}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${w.cls}`}>{w.label}</span>
                </div>
              )) : (
                <div className="p-3 rounded-xl border border-dashed border-border bg-muted/20 dark:bg-muted/30 text-xs text-muted-foreground">
                  Smart work windows will appear after the backend sends a user-specific live risk score.
                </div>
              )}
            </div>

            <div className="bg-sidebar dark:bg-sidebar/80 rounded-xl p-4 border border-sidebar-border/40">
              <p className="text-[10px] font-semibold text-sidebar-foreground/70 uppercase tracking-wider mb-2">AI Suggestions</p>
              <ul className="space-y-2 text-xs text-sidebar-foreground/90">
                {aiTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1" />
                    {tip}
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-sidebar-foreground/10 flex justify-between items-center">
                <span className="text-[10px] text-sidebar-foreground/60">Optimised Earnings</span>
                <span className="text-base font-bold text-primary">
                  {optimizedEarnings == null ? 'Waiting for sync' : formatCurrency(optimizedEarnings)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-card-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold text-card-foreground">Current Conditions</p>
          </div>
          <div className="space-y-2.5">
            {conditions.map((c) => (
              <div key={c.label} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${c.row} dark:bg-muted/25 border-card-border`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.cls} dark:brightness-110`}>
                    <c.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-card-foreground">{c.label}</span>
                </div>
                <span className="text-sm font-bold text-card-foreground">{c.value}</span>
              </div>
            ))}
            <div className="pt-1 text-center">
              <span className="text-xs font-semibold text-primary dark:text-primary/80 bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 px-3 py-1 rounded-full inline-block">
                {currentStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-card-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold text-card-foreground">Income Simulator</p>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1.5">Expected Daily Income</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">Rs</span>
                <input
                  type="number"
                  value={simIncome}
                  readOnly
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-muted text-muted-foreground text-sm font-medium dark:bg-muted/40"
                />
              </div>
            </div>
            <button
              onClick={handleSimulate}
              disabled={simulateMutation.isPending || simIncome <= 0 || profileLoading || policyLoading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm shadow-md shadow-primary/20 active:scale-95 transition-all disabled:opacity-60"
            >
              {simulateMutation.isPending ? 'Calculating...' : 'Estimate Protection'}
            </button>
            {simResult && (
              <div className="pt-3 border-t border-border space-y-2 animate-in fade-in slide-in-from-bottom-2">
                {(simResult.loss <= 0 && simResult.payout <= 0) ? (
                  <div className="text-sm text-center text-green-300 dark:text-green-200 bg-green-900/30 dark:bg-green-900/40 border border-green-800/40 dark:border-green-700/50 rounded-xl px-3 py-2">
                    You are in safe condition. No disruption loss predicted right now.
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Estimated Disruption Loss</span>
                      <span className="font-bold text-red-400 dark:text-red-300">-{formatCurrency(simResult.loss)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">RakshitArtha Auto Payout</span>
                      <span className="font-bold text-green-400 dark:text-green-300">+{formatCurrency(simResult.payout)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-dashed border-border">
                      <span className="font-bold text-card-foreground">Net Saved Income</span>
                      <span className="font-bold text-primary">{formatCurrency(simIncome - simResult.loss + simResult.payout)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="h-2" />
      </div>
    </MobileLayout>
  );
}
