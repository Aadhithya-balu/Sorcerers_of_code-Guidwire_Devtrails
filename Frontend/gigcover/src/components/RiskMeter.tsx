import React from 'react';
import { cn, getRiskColor, getRiskLabel } from '@/utils/helpers';

interface RiskMeterProps {
  score: number; // 0 to 1
  className?: string;
}

export function RiskMeter({ score, className }: RiskMeterProps) {
  const normalizedScore = Math.max(0, Math.min(1, score));
  const color = getRiskColor(normalizedScore);
  const label = getRiskLabel(normalizedScore);
  
  // Calculate SVG arc parameters
  const radius = 40;
  const circumference = Math.PI * radius; // Half circle
  const strokeDashoffset = circumference - (normalizedScore * circumference);

  const colorClasses = {
    green: "text-success stroke-success",
    yellow: "text-warning stroke-warning",
    red: "text-destructive stroke-destructive"
  };

  return (
    <div className={cn("flex flex-col items-center justify-center relative", className)}>
      <svg className="w-32 h-16 transform" viewBox="0 0 100 50">
        {/* Background Arc */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          className="stroke-muted"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Value Arc */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          className={cn("transition-all duration-1000 ease-out", colorClasses[color])}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
        <span className="text-2xl font-display font-bold leading-none">
          {normalizedScore.toFixed(2)}
        </span>
        <span className={cn("text-xs font-semibold uppercase tracking-wider", colorClasses[color].split(' ')[0])}>
          {label} RISK
        </span>
      </div>
    </div>
  );
}
