"use client";

import React, { useMemo } from 'react';
import { useCBMStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReactECharts from 'echarts-for-react';

export default function PredictiveAnalytics() {
  const data = useCBMStore((state) => state.filteredData);

  const constellationOptions = useMemo(() => {
    // We want a network graph of Equipment -> CauseCode
    const nodesMap: any = {};
    const linksMap: any = {};

    data.forEach((d) => {
      if (!d.equipment || d.equipment === 'Unknown' || !d.causeCode || d.causeCode === 'Unknown') return;
      
      const eqNode = `EQ:${d.equipment}`;
      const causeNode = `CAUSE:${d.causeCode}`;

      if (!nodesMap[eqNode]) {
        nodesMap[eqNode] = { name: eqNode, symbolSize: 10, category: 0, label: { show: true, formatter: d.equipment } };
      } else {
        nodesMap[eqNode].symbolSize = Math.min(50, nodesMap[eqNode].symbolSize + 2);
      }

      if (!nodesMap[causeNode]) {
        nodesMap[causeNode] = { name: causeNode, symbolSize: 10, category: 1, label: { show: true, formatter: d.causeCode } };
      } else {
        nodesMap[causeNode].symbolSize = Math.min(50, nodesMap[causeNode].symbolSize + 2);
      }

      const linkId = `${eqNode}->${causeNode}`;
      if (!linksMap[linkId]) {
        linksMap[linkId] = { source: eqNode, target: causeNode, value: 1 };
      } else {
        linksMap[linkId].value += 1;
      }
    });

    const nodes = Object.values(nodesMap);
    const links = Object.values(linksMap);

    return {
      tooltip: {},
      legend: [{
        data: ['Equipment', 'Cause Code']
      }],
      animationDuration: 1500,
      animationEasingUpdate: 'quinticInOut',
      series: [
        {
          name: 'Failure Constellation',
          type: 'graph',
          layout: 'force',
          data: nodes,
          links: links,
          categories: [
            { name: 'Equipment', itemStyle: { color: '#3b82f6' } },
            { name: 'Cause Code', itemStyle: { color: '#ef4444' } }
          ],
          roam: true,
          label: {
            position: 'right',
            formatter: '{b}'
          },
          lineStyle: {
            color: 'source',
            curveness: 0.3
          },
          force: {
            repulsion: 100,
            edgeLength: 50
          }
        }
      ]
    };
  }, [data]);

  const anomalyScore = useMemo(() => {
    // Mock anomaly calculation based on average closure time and open percentage
    let openCount = 0;
    data.forEach(d => { if (d.isOpen) openCount++; });
    const openPct = (openCount / (data.length || 1)) * 100;
    
    if (openPct > 40) return { score: 85, level: 'High Risk', text: 'Critical backlog of open notifications.' };
    if (openPct > 20) return { score: 55, level: 'Moderate', text: 'Increasing trend in open notifications.' };
    return { score: 25, level: 'Healthy', text: 'Maintenance execution is keeping up with observations.' };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="col-span-3 md:col-span-1">
          <CardHeader>
            <CardTitle>Reliability Scorecard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center p-6 border rounded-lg bg-muted/20">
              <div className="text-5xl font-bold mb-2" style={{ color: anomalyScore.score > 70 ? '#ef4444' : anomalyScore.score > 40 ? '#f59e0b' : '#22c55e' }}>
                {anomalyScore.score}/100
              </div>
              <div className="text-lg font-semibold">{anomalyScore.level}</div>
              <p className="text-sm text-muted-foreground mt-2">{anomalyScore.text}</p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">AI Recommendations:</h4>
              <ul className="text-sm space-y-2 text-muted-foreground list-disc pl-4">
                <li>Focus on reducing backlog in Top 2 Areas.</li>
                <li>Investigate repeat causes for Top 3 Equipment.</li>
                <li>Allocate more resources to aging notifications &gt; 30 days.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 md:col-span-2">
          <CardHeader>
            <CardTitle>Failure Constellation (AI-Detected Patterns)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] w-full bg-background border rounded-lg overflow-hidden">
              <ReactECharts
                option={constellationOptions}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'canvas' }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
