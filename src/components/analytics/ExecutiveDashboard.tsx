"use client";

import React, { useMemo } from 'react';
import { useCBMStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

const KPICard = ({ title, value, subtitle, delay, color = "border-muted" }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <Card className={`border-t-4 shadow-sm ${color}`}>
      <CardContent className="pt-6 text-center">
        <div className="text-4xl font-bold mb-2">{value}</div>
        <CardTitle className="text-sm font-medium text-muted-foreground mb-1">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  </motion.div>
);

export default function ExecutiveDashboard() {
  const data = useCBMStore((state) => state.filteredData);

  // Compute KPIs exactly as per PDF Page 4
  const kpis = useMemo(() => {
    if (!data.length) return null;
    
    const totalCN = data.length;
    
    // Smelter Splits
    const s1CN = data.filter(d => d.plantName === 'Smelter 1').length;
    const s2CN = data.filter(d => d.plantName === 'Smelter 2').length;
    
    // Closure calculations
    const closedData = data.filter(d => !d.isOpen && d.completionDate && d.notificationDate);
    // Exclude >=25 days as outliers
    const validClosedData = closedData.map(d => {
      return dayjs(d.completionDate).diff(dayjs(d.notificationDate), 'day');
    }).filter(days => days < 25 && days >= 0);
    
    const avgCloseTime = validClosedData.length > 0 
      ? (validClosedData.reduce((a, b) => a + b, 0) / validClosedData.length).toFixed(1)
      : '0';
    const maxCloseTime = validClosedData.length > 0 ? Math.max(...validClosedData) : 0;
    
    // Status splits
    const openCN = data.filter(d => d.isOpen).length;
    const closedCN = totalCN - openCN;
    
    // Top CN Area
    const areaCounts: Record<string, number> = {};
    data.forEach(d => {
      areaCounts[d.area] = (areaCounts[d.area] || 0) + 1;
    });
    const topArea = Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];
    
    // Hotspot Count
    const hotspots = data.filter(d => d.isHotspot).length;
    
    // Top Cause (excluding Hotspot)
    const causeCounts: Record<string, number> = {};
    data.filter(d => !d.isHotspot).forEach(d => {
      causeCounts[d.causeCode] = (causeCounts[d.causeCode] || 0) + 1;
    });
    const topCause = Object.entries(causeCounts).sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];
    
    // Most Critical Area (Highest % open CNs)
    const areaStats: Record<string, { total: number, open: number }> = {};
    data.forEach(d => {
      if (!areaStats[d.area]) areaStats[d.area] = { total: 0, open: 0 };
      areaStats[d.area].total++;
      if (d.isOpen) areaStats[d.area].open++;
    });
    const criticalArea = Object.entries(areaStats)
      .map(([area, stats]) => ({ area, openPct: stats.total > 0 ? (stats.open / stats.total) * 100 : 0 }))
      .sort((a, b) => b.openPct - a.openPct)[0] || { area: 'Unknown', openPct: 0 };

    // Rectification Compliance (calculated via OnTime)
    // Python script logic: rect_pct = df["OnTime"].mean() * 100
    // Wait, df["OnTime"] in python evaluates over all rows (or valid rows).
    // The python script does df["OnTime"].mean() * 100 over all data.
    const compliantCount = data.filter(d => d.isOnTime).length;
    const compliancePct = data.length > 0 
      ? ((compliantCount / data.length) * 100).toFixed(1)
      : '100';

    return {
      totalCN,
      s1CN, s1Pct: ((s1CN/totalCN)*100).toFixed(0),
      s2CN, s2Pct: ((s2CN/totalCN)*100).toFixed(0),
      avgCloseTime, maxCloseTime,
      openCN, openPct: ((openCN/totalCN)*100).toFixed(0),
      closedCN, closedPct: ((closedCN/totalCN)*100).toFixed(0),
      topArea: topArea[0], topAreaCount: topArea[1], topAreaPct: ((topArea[1]/totalCN)*100).toFixed(0),
      hotspots, hotspotPct: ((hotspots/totalCN)*100).toFixed(0),
      topCause: topCause[0], topCauseCount: topCause[1], topCausePct: ((topCause[1]/totalCN)*100).toFixed(0),
      criticalArea: criticalArea.area, criticalAreaPct: criticalArea.openPct.toFixed(0),
      compliancePct
    };
  }, [data]);

  if (!data.length || !kpis) {
    return <div className="flex h-full items-center justify-center p-8 text-muted-foreground">No data available. Please upload a CBM export.</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto bg-muted/20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">CBM Summary Dashboard</h2>
          <p className="text-muted-foreground">Condition Monitoring Insights Executive Overview</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard 
          title="Total CN Count" 
          value={kpis.totalCN} 
          subtitle="Across uploaded period" 
          color="border-blue-500 text-blue-600"
          delay={0.1} 
        />
        <KPICard 
          title="Smelter 1 CNs" 
          value={kpis.s1CN} 
          subtitle={`${kpis.s1Pct}% of total`} 
          color="border-blue-400 text-blue-500"
          delay={0.15} 
        />
        <KPICard 
          title="Smelter 2 CNs" 
          value={kpis.s2CN} 
          subtitle={`${kpis.s2Pct}% of total`} 
          color="border-teal-500 text-teal-600"
          delay={0.2} 
        />
        <KPICard 
          title="Avg Closing Time" 
          value={`${kpis.avgCloseTime} days`} 
          subtitle={`Max: ${kpis.maxCloseTime} days | Excl. ≥25d outliers`} 
          color="border-amber-500 text-amber-600"
          delay={0.25} 
        />
        
        <KPICard 
          title="Open (CRT)" 
          value={kpis.openCN} 
          subtitle={`${kpis.openPct}% of total CNs`} 
          color="border-red-500 text-red-600"
          delay={0.3} 
        />
        <KPICard 
          title="Closed (MRG)" 
          value={kpis.closedCN} 
          subtitle={`${kpis.closedPct}% of total CNs`} 
          color="border-green-500 text-green-600"
          delay={0.35} 
        />
        <KPICard 
          title="Top CN Area" 
          value={kpis.topArea} 
          subtitle={`${kpis.topAreaCount} CNs (${kpis.topAreaPct}% of total)`} 
          color="border-blue-600 text-blue-700"
          delay={0.4} 
        />
        <KPICard 
          title="Hotspot Count" 
          value={kpis.hotspots} 
          subtitle={`${kpis.hotspotPct}% of all CNs`} 
          color="border-orange-500 text-orange-600"
          delay={0.45} 
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KPICard 
          title="Top Cause (excl. Hotspot)" 
          value={kpis.topCause} 
          subtitle={`${kpis.topCauseCount} CNs (${kpis.topCausePct}% of total)`} 
          color="border-purple-500 text-purple-600"
          delay={0.5} 
        />
        <KPICard 
          title="Most Critical Area (CRT %)" 
          value={kpis.criticalArea} 
          subtitle={`${kpis.criticalAreaPct}% open CNs — needs attention`} 
          color="border-red-600 text-red-600"
          delay={0.55} 
        />
        <KPICard 
          title="Rectification Compliance" 
          value={`${kpis.compliancePct}%`} 
          subtitle="On-time closure rate" 
          color="border-green-500 text-green-600"
          delay={0.6} 
        />
      </div>
    </div>
  );
}
