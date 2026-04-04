import React, { useMemo } from 'react';
import { BellRing, Filter, CloudRain, Car, Wind, AlertTriangle, Info } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAlerts, useRiskSnapshot } from '@/hooks/use-api';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime, cn } from '@/utils/helpers';

export default function Alerts() {
  const { user } = useAuth();
  const defaultUserEmail = import.meta.env.VITE_DEFAULT_USER_EMAIL || 'rajesh@swiggy.com';
  const userIdentifier = {
    userId: user?.backendUserId,
    email: user?.email || defaultUserEmail,
  };
  const { data: backendAlerts = [], isLoading } = useAlerts();
  const { data: riskSnapshot } = useRiskSnapshot(userIdentifier);

  const riskAdvisoryAlert = useMemo(() => {
    const score = riskSnapshot?.overallRisk;
    if (typeof score !== 'number') {
      return null;
    }

    const roundedScore = Math.round(score);
    const zone = riskSnapshot?.zone || riskSnapshot?.riskZone || 'Your Zone';
    const timestamp = riskSnapshot?.updatedAt || new Date().toISOString();

    if (roundedScore <= 35) {
      return {
        id: 'risk-advisory-low',
        title: 'You are safe to work',
        description: `Current risk is low (${roundedScore}/100). Conditions look stable for work.`,
        severity: 'Info',
        timestamp,
        zone,
      };
    }

    if (roundedScore <= 60) {
      return {
        id: 'risk-advisory-medium',
        title: 'Moderate risk advisory',
        description: `Risk is moderate (${roundedScore}/100). Continue with caution and monitor updates.`,
        severity: 'Medium',
        timestamp,
        zone,
      };
    }

    if (roundedScore <= 80) {
      return {
        id: 'risk-advisory-high',
        title: 'High risk advisory',
        description: `Risk is high (${roundedScore}/100). Limit exposure and avoid high-risk routes.`,
        severity: 'High',
        timestamp,
        zone,
      };
    }

    return {
      id: 'risk-advisory-critical',
      title: 'Critical risk advisory',
      description: `Risk is critical (${roundedScore}/100). Pause work and wait for safer conditions.`,
      severity: 'Critical',
      timestamp,
      zone,
    };
  }, [riskSnapshot?.overallRisk, riskSnapshot?.riskZone, riskSnapshot?.updatedAt, riskSnapshot?.zone]);

  const alerts = useMemo(() => {
    if (!riskAdvisoryAlert) {
      return backendAlerts;
    }
    return [riskAdvisoryAlert, ...backendAlerts];
  }, [backendAlerts, riskAdvisoryAlert]);

  const getIcon = (title: string, severity: string) => {
    if (title.toLowerCase().includes('rain')) return CloudRain;
    if (title.toLowerCase().includes('traffic')) return Car;
    if (title.toLowerCase().includes('aqi')) return Wind;
    if (severity === 'Info') return Info;
    return AlertTriangle;
  };

  const severityStyle = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return { bg: 'bg-red-900/30 border-red-800/40', badge: 'bg-red-900/50 text-red-300', icon: 'bg-red-900/40 text-red-400', bar: 'bg-red-500' };
      case 'high':     return { bg: 'bg-orange-900/30 border-orange-800/40', badge: 'bg-orange-900/50 text-orange-300', icon: 'bg-orange-900/40 text-orange-400', bar: 'bg-primary' };
      case 'medium':   return { bg: 'bg-yellow-900/30 border-yellow-800/40', badge: 'bg-yellow-900/50 text-yellow-300', icon: 'bg-yellow-900/40 text-yellow-400', bar: 'bg-yellow-500' };
      default:         return { bg: 'bg-green-900/30 border-green-800/40', badge: 'bg-green-900/50 text-green-300', icon: 'bg-green-900/40 text-green-400', bar: 'bg-green-500' };
    }
  };

  return (
    <MobileLayout title="Alerts">
      <div className="px-4 py-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-foreground">Live Alerts</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Real-time parametric triggers in your zones.</p>
          </div>
          <button className="flex items-center gap-1.5 bg-card border border-card-border text-sm font-semibold text-card-foreground px-3 py-2 rounded-xl shadow-sm active:scale-95 transition-all">
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
        </div>

        {/* Alerts count badge */}
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
          <div className="relative flex h-2 w-2">
            {alerts.length > 0 ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground/60" />
            )}
          </div>
          <span className="text-xs font-semibold text-primary">
            {alerts.length > 0
              ? `${alerts.length} active alert${alerts.length !== 1 ? 's' : ''} in your zones`
              : 'No active alerts in your zones'}
          </span>
        </div>

        {/* Alert list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-secondary rounded-2xl h-24 animate-pulse border border-card-border" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-card rounded-2xl p-12 flex flex-col items-center text-center shadow-sm border border-card-border">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
              <BellRing className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">All Clear</h3>
            <p className="text-sm text-muted-foreground">Conditions in your zones are currently normal.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => {
              const style = severityStyle(alert.severity);
              const IconComp = getIcon(alert.title, alert.severity);
              return (
                <div key={alert.id} className={`bg-card rounded-2xl border shadow-sm overflow-hidden ${style.bg}`}>
                  {/* severity bar */}
                  <div className={`h-1 w-full ${style.bar}`} />
                  <div className="p-4 flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${style.icon}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-bold text-foreground truncate">{alert.title}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${style.badge}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{alert.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground bg-secondary/60 border border-card-border px-2 py-0.5 rounded-full">
                          📍 {alert.zone}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatDateTime(alert.timestamp)}</span>
                      </div>
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
