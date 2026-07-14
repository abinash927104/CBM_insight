"use client";

import React, { useMemo } from 'react';
import { useCBMStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from 'recharts';

export default function EquipmentAnalytics() {
  const data = useCBMStore((state) => state.filteredData);

  const equipmentData = useMemo(() => {
    const counts: any = {};
    data.forEach((d) => {
      if (d.equipment && d.equipment !== 'Unknown') {
        counts[d.equipment] = (counts[d.equipment] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 15);
  }, [data]);

  const causeParetoData = useMemo(() => {
    const counts: any = {};
    let total = 0;
    data.forEach((d) => {
      if (d.causeCode && d.causeCode !== 'Unknown') {
        counts[d.causeCode] = (counts[d.causeCode] || 0) + 1;
        total += 1;
      }
    });
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a: any, b: any) => b.count - a.count);
    
    let cumSum = 0;
    return sorted.map((item: any) => {
      cumSum += item.count;
      return {
        ...item,
        cumulativePct: Math.round((cumSum / total) * 100),
      };
    }).slice(0, 15);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-2 md:col-span-1">
          <CardHeader>
            <CardTitle>Top Failing Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={equipmentData} layout="vertical" margin={{ left: 80, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f59e0b" name="Failures" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardHeader>
            <CardTitle>Cause Code Pareto Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={causeParetoData} margin={{ left: 20, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={10} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="count" fill="#8b5cf6" name="Occurrences" />
                  <Line yAxisId="right" type="monotone" dataKey="cumulativePct" stroke="#ef4444" name="Cumulative %" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
