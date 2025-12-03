'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

interface TemplateStats {
  template_name: string;
  total: number;
  delivered: number;
  read: number;
  failed: number;
}

interface TemplateChartProps {
  data: TemplateStats[];
}

export default function TemplateChart({ data }: TemplateChartProps) {
  const colors = ['#0052CC', '#003D99', '#0066FF', '#004DB3', '#0047A3', '#003380', '#005CE6', '#0040B3'];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" horizontal={true} vertical={false} />
        <XAxis 
          type="number"
          tick={{ fill: '#666666', fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#E5E5E5' }}
        />
        <YAxis 
          type="category"
          dataKey="template_name" 
          tick={{ fill: '#666666', fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#E5E5E5' }}
          width={100}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #E5E5E5',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          formatter={(value: number, name: string) => [value.toLocaleString(), name]}
        />
        <Legend />
        <Bar dataKey="total" name="Total" radius={[0, 4, 4, 0]}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

