"use client";

import React, { useMemo } from 'react';
import { useCBMStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
} from 'recharts';
import dayjs from 'dayjs';

export default function TimeAnalytics() {
  const data = useCBMStore((state) => state.filteredData);

  const monthlyData = useMemo(() => {
    if (!data.length) return [];
    
    const months: any = {};
    data.forEach(d => {
      const monthStr = dayjs(d.notificationDate).format('YYYY-MM');
      if (!months[monthStr]) months[monthStr] = { name: monthStr, total: 0, open: 0, closed: 0 };
      months[monthStr].total += 1;
      if (d.isOpen) months[monthStr].open += 1;
      else months[monthStr].closed += 1;
    });

    const sorted = Object.values(months).sort((a: any, b: any) => a.name.localeCompare(b.name));
    
    // Calculate simple moving average (3 periods)
    return sorted.map((item: any, i: number, arr: any[]) => {
      let sma = item.total;
      if (i >= 2) {
        sma = Math.round((arr[i].total + arr[i-1].total + arr[i-2].total) / 3);
      } else if (i === 1) {
        sma = Math.round((arr[i].total + arr[i-1].total) / 2);
      }
      return { ...item, displayMonth: dayjs(item.name).format('MMM YY'), sma };
    });
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Monthly Notifications vs Moving Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid stroke="#f5f5f5" />
                  <XAxis dataKey="displayMonth" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" barSize={20} fill="#3b82f6" name="Total CNs" />
                  <Line type="monotone" dataKey="sma" stroke="#ef4444" strokeWidth={3} name="3-Month Moving Average" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
