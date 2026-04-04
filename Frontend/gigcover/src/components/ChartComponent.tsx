import React from 'react';
import { 
  AreaChart, Area, 
  LineChart, Line, 
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { ChartDataPoint } from '@/services/api';
import { formatCurrency } from '@/utils/helpers';

interface ChartComponentProps {
  data: any[];
  type: 'area' | 'line' | 'pie';
  dataKey?: string;
  nameKey?: string;
  height?: number;
  colors?: string[];
}

export function ChartComponent({ 
  data, 
  type, 
  dataKey = 'payout', 
  nameKey = 'name',
  height = 200,
  colors = ['hsl(var(--primary))']
}: ChartComponentProps) {
  
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>;
  }

  const renderTooltipFormatter = (value: number, name: string) => {
    if (name === 'payout' || name === 'value') return [formatCurrency(value), 'Amount'];
    if (name === 'risk') return [value.toFixed(2), 'Risk Score'];
    return [value, name];
  };

  if (type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => [`${value}%`, 'Contribution']}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          />
          <Legend verticalAlign="bottom" height={36} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey={nameKey} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
          <Tooltip 
            formatter={renderTooltipFormatter}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          />
          <Line 
            type="monotone" 
            dataKey={dataKey} 
            stroke={colors[0]} 
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--card))' }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`color-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={colors[0]} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey={nameKey} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip 
          formatter={renderTooltipFormatter}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
        />
        <Area 
          type="monotone" 
          dataKey={dataKey} 
          stroke={colors[0]} 
          strokeWidth={3}
          fillOpacity={1} 
          fill={`url(#color-${dataKey})`} 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
