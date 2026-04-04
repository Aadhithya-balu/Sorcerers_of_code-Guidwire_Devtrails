import React, { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, ShieldAlert, Wallet, Bell, Layers } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAuth } from '@/context/AuthContext';
import { useSimulateDemoClaim } from '@/hooks/use-api';
import { cn, formatCurrency } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';

type Plan = 'standard' | 'premium';

const disruptionOptions = [
  'HEAVY_RAIN',
  'HIGH_POLLUTION',
  'TRAFFIC_BLOCKED',
  'THUNDERSTORM',
  'FLOODING',
  'EXTREME_HEAT',
  'OTHER',
];

const otherOptions = ['CURFEW', 'STRIKE', 'UNEXPECTED_EVENT', 'MARKET_CLOSURE', 'PLATFORM_DOWNTIME', 'HEALTH_ISSUE'];

function StatusIcon({ passed }: { passed: boolean }) {
  return passed ? (
    <CheckCircle2 className="w-4 h-4 text-green-600" />
  ) : (
    <XCircle className="w-4 h-4 text-red-600" />
  );
}

export default function Demo() {
  const { user } = useAuth();
  const defaultUserEmail = import.meta.env.VITE_DEFAULT_USER_EMAIL || 'rajesh@swiggy.com';
  const userIdentifier = {
    userId: user?.backendUserId,
    email: user?.email || defaultUserEmail,
  };

  const simulateMutation = useSimulateDemoClaim();
  const [selectedPlan, setSelectedPlan] = useState<Plan>('standard');
  const [disruptionType, setDisruptionType] = useState('HEAVY_RAIN');
  const [otherReason, setOtherReason] = useState('CURFEW');
  const [rainfall, setRainfall] = useState(62);
  const [aqi, setAqi] = useState(210);
  const [traffic, setTraffic] = useState(4);
  const [lostIncome, setLostIncome] = useState(350);

  const result = simulateMutation.data;
  const fraudLayerEntries = useMemo(
    () => Object.entries(result?.workflow?.fraudLayers || {}),
    [result?.workflow?.fraudLayers]
  );

  const runSimulation = async () => {
    try {
      const response = await simulateMutation.mutateAsync({
        identifier: userIdentifier,
        payload: {
          selectedPlan,
          disruptionType,
          otherReason: disruptionType === 'OTHER' ? otherReason : undefined,
          rainfall,
          aqi,
          traffic,
          lostIncome,
        },
      });

      toast({
        title: response.approved ? 'Demo workflow completed' : 'Demo workflow rejected',
        description: response.approved
          ? 'All required layers completed, payout stage reached.'
          : response.rejectionReason || 'One or more workflow layers failed.',
        variant: response.approved ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Simulation failed',
        description: error instanceof Error ? error.message : 'Unable to run demo simulation',
        variant: 'destructive',
      });
    }
  };

  return (
    <MobileLayout title="Demo">
      <div className="px-4 py-4 space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-extrabold text-foreground mb-1">Rule-Based Claim Demo</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Weather + disruption + income inputs flow through six fraud layers and payout logic.
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-card-border p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Plan</label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value as Plan)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-card-border text-sm bg-secondary text-card-foreground"
            >
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Disruption Type</label>
            <select
              value={disruptionType}
              onChange={(e) => setDisruptionType(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-card-border text-sm bg-secondary text-card-foreground"
            >
              {disruptionOptions.map((value) => (
                <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>
              ))}
            </select>
          </div>

          {disruptionType === 'OTHER' && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Other Reason</label>
              <select
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-card-border text-sm bg-secondary text-card-foreground"
              >
                {otherOptions.map((value) => (
                  <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Reasons like health issue are outside policy rules and will be rejected.
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Rainfall (mm)</label>
              <input type="number" className="mt-1 w-full px-3 py-2 rounded-xl border border-card-border text-sm bg-secondary text-card-foreground" value={rainfall} onChange={(e) => setRainfall(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">AQI</label>
              <input type="number" className="mt-1 w-full px-3 py-2 rounded-xl border border-card-border text-sm bg-secondary text-card-foreground" value={aqi} onChange={(e) => setAqi(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Traffic</label>
              <input type="number" className="mt-1 w-full px-3 py-2 rounded-xl border border-card-border text-sm bg-secondary text-card-foreground" value={traffic} onChange={(e) => setTraffic(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Lost Income (Rs)</label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-card-border text-sm bg-secondary text-card-foreground"
              value={lostIncome}
              onChange={(e) => setLostIncome(Number(e.target.value))}
            />
          </div>

          <button
            onClick={runSimulation}
            disabled={simulateMutation.isPending}
            className="w-full py-3 rounded-xl bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 active:scale-95 transition-all disabled:opacity-60"
          >
            {simulateMutation.isPending ? 'Running simulation...' : 'Run Workflow'}
          </button>
        </div>

        {result && (
          <div className={cn(
            'bg-card rounded-2xl shadow-sm border overflow-hidden',
            result.approved ? 'border-green-800/40' : 'border-red-800/40'
          )}>
            <div className="px-4 py-3 border-b border-card-border flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">Workflow Layers</p>
              <span className={cn(
                'text-xs font-bold px-2 py-0.5 rounded-full',
                result.approved ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'
              )}>
                {result.approved ? 'APPROVED' : 'REJECTED'}
              </span>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <StatusIcon passed={result.workflow.policyPaymentVerified.passed} />
                <div>
                  <p className="text-sm font-semibold text-foreground">Policy payment verified</p>
                  <p className="text-xs text-muted-foreground">{result.workflow.policyPaymentVerified.reason}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <StatusIcon passed={result.workflow.disruptionDetected.passed} />
                <div>
                  <p className="text-sm font-semibold text-foreground">Disruption detected</p>
                  <p className="text-xs text-muted-foreground">{result.workflow.disruptionDetected.reason}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <StatusIcon passed={result.workflow.incomeLossValidated.passed} />
                <div>
                  <p className="text-sm font-semibold text-foreground">Income loss validated</p>
                  <p className="text-xs text-muted-foreground">
                    {result.workflow.incomeLossValidated.reason} Loss: {result.incomeLossPercent}%
                  </p>
                </div>
              </div>

                <div className="rounded-xl border border-card-border p-3 bg-secondary/30">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Fraud detection (6 layers)</p>
                </div>
                <div className="space-y-2">
                  {fraudLayerEntries.map(([key, layer]) => (
                    <div key={key} className="flex items-start gap-2">
                      <StatusIcon passed={!layer.triggered} />
                      <div>
                        <p className="text-xs font-semibold text-foreground">{key}</p>
                        <p className="text-[11px] text-muted-foreground">{layer.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <StatusIcon passed={result.workflow.payoutCalculated.passed} />
                <div>
                  <p className="text-sm font-semibold text-foreground">Claim amount calculated</p>
                  <p className="text-xs text-muted-foreground">
                    {result.workflow.payoutCalculated.reason}
                  </p>
                  <p className="text-sm font-bold text-foreground mt-1">
                    {formatCurrency(result.claimAmount)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <StatusIcon passed={result.workflow.payoutSent.passed} />
                <div>
                  <p className="text-sm font-semibold text-foreground">Payout transfer</p>
                  <p className="text-xs text-muted-foreground">{result.workflow.payoutSent.reason}</p>
                </div>
                <Wallet className="w-4 h-4 text-primary mt-0.5 ml-auto" />
              </div>

              <div className="flex items-start gap-3">
                <StatusIcon passed={result.workflow.notificationSent.passed} />
                <div>
                  <p className="text-sm font-semibold text-foreground">Push notification</p>
                  <p className="text-xs text-muted-foreground">{result.workflow.notificationSent.reason}</p>
                </div>
                <Bell className="w-4 h-4 text-primary mt-0.5 ml-auto" />
              </div>

              {!result.approved && (
                <div className="rounded-xl border border-red-800/40 bg-red-900/30 px-3 py-2">
                  <div className="flex items-center gap-2 text-red-300">
                    <ShieldAlert className="w-4 h-4" />
                    <p className="text-xs font-semibold">{result.rejectionReason || 'Claim rejected by workflow checks'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
