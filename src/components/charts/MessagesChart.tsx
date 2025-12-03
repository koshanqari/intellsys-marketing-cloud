'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DailyStats {
  date: string;
  total: number;
  delivered: number;
  read: number;
}

interface MessagesChartProps {
  data: DailyStats[];
}

export default function MessagesChart({ data }: MessagesChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0052CC" stopOpacity={0.1}/>
            <stop offset="95%" stopColor="#0052CC" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0D7C3D" stopOpacity={0.1}/>
            <stop offset="95%" stopColor="#0D7C3D" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorRead" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#B8860B" stopOpacity={0.1}/>
            <stop offset="95%" stopColor="#B8860B" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
        <XAxis 
          dataKey="date" 
          tick={{ fill: '#666666', fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#E5E5E5' }}
        />
        <YAxis 
          tick={{ fill: '#666666', fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#E5E5E5' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #E5E5E5',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        />
        <Legend />
        <Area 
          type="monotone" 
          dataKey="total" 
          name="Total"
          stroke="#0052CC" 
          fillOpacity={1} 
          fill="url(#colorTotal)" 
          strokeWidth={2}
        />
        <Area 
          type="monotone" 
          dataKey="delivered" 
          name="Delivered"
          stroke="#0D7C3D" 
          fillOpacity={1} 
          fill="url(#colorDelivered)" 
          strokeWidth={2}
        />
        <Area 
          type="monotone" 
          dataKey="read" 
          name="Read"
          stroke="#B8860B" 
          fillOpacity={1} 
          fill="url(#colorRead)" 
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

