import React from 'react';
import { AlertTriangle, Info, CloudRain, Car, Wind } from 'lucide-react';
import { Alert } from '@/services/api';
import { cn, formatDateTime, getSeverityColor } from '@/utils/helpers';
import { Card } from '@/components/ui/card';

interface AlertCardProps {
  alert: Alert;
}

export function AlertCard({ alert }: AlertCardProps) {
  const colorClass = getSeverityColor(alert.severity);
  
  const getIcon = () => {
    if (alert.title.toLowerCase().includes('rain')) return <CloudRain className="w-5 h-5" />;
    if (alert.title.toLowerCase().includes('traffic')) return <Car className="w-5 h-5" />;
    if (alert.title.toLowerCase().includes('aqi')) return <Wind className="w-5 h-5" />;
    if (alert.severity === 'Info') return <Info className="w-5 h-5" />;
    return <AlertTriangle className="w-5 h-5" />;
  };

  return (
    <Card className={cn("overflow-hidden transition-all duration-300 hover:shadow-md", colorClass.split(' ')[1] ? `border-l-4 border-l-${colorClass.split(' ')[1].split('-')[1]}` : '')}>
      <div className="p-4 flex items-start gap-4">
        <div className={cn("p-2 rounded-full mt-1", colorClass.split(' ')[2])}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-semibold text-foreground truncate">{alert.title}</h4>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(alert.timestamp)}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", colorClass)}>
              {alert.severity}
            </span>
            <span className="text-xs text-muted-foreground">
              {alert.zone}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
