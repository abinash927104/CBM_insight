"use client";

import React from 'react';
import { useCBMStore } from '@/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DashboardFilters() {
  const { filters, setFilter, plants, areas, equipment } = useCBMStore();

  return (
    <div className="flex flex-wrap items-center gap-4 py-4 px-6 bg-muted/10 border-b">
      <span className="text-sm font-semibold text-muted-foreground mr-2">Global Filters:</span>
      
      <div className="w-[180px]">
        <Select value={filters.plant || "ALL"} onValueChange={(val) => setFilter('plant', val === 'ALL' ? null : val)}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="All Plants" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Plants</SelectItem>
            {plants.map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-[180px]">
        <Select value={filters.area || "ALL"} onValueChange={(val) => setFilter('area', val === 'ALL' ? null : val)}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="All Areas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Areas</SelectItem>
            {areas.map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-[150px]">
        <Select value={filters.status} onValueChange={(val: any) => setFilter('status', val)}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="OPEN">Open (CRT)</SelectItem>
            <SelectItem value="CLOSED">Closed (MRG)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
    </div>
  );
}
