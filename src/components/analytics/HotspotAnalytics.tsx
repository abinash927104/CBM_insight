"use client";

import React, { useMemo } from 'react';
import { useCBMStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function HotspotAnalytics() {
  const data = useCBMStore((state) => state.filteredData);

  const hotspotData = useMemo(() => {
    // We want to group by Plant -> Area to find "Hotspots"
    // X = Number of failures, Y = Average Ageing (Days), Z = Number of Open CNs (size)
    const groups: any = {};
    data.forEach((d) => {
      const key = `${d.plantName} - ${d.area}`;
      if (!groups[key]) {
        groups[key] = { name: key, failures: 0, openCNs: 0, totalAgeing: 0 };
      }
      groups[key].failures += 1;
      if (d.isOpen) groups[key].openCNs += 1;
      groups[key].totalAgeing += d.ageing;
    });

    return Object.values(groups).map((g: any) => ({
      name: g.name,
      failures: g.failures,
      avgAgeing: Math.round(g.totalAgeing / g.failures),
      openCNs: g.openCNs,
    })).filter((g: any) => g.failures > 5); // Only show significant clusters
  }, [data]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Risk Heatmap: Failures vs Resolution Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="failures" name="Total Failures" unit=" CNs" />
                <YAxis type="number" dataKey="avgAgeing" name="Avg Resolution Time" unit=" Days" />
                <ZAxis type="number" dataKey="openCNs" range={[50, 400]} name="Open CNs" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Hotspots" data={hotspotData} fill="#ef4444" opacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Bubble size represents the number of currently open Condition Notifications.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
