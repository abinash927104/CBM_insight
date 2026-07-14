"use client";

import React, { useState } from 'react';
import { useCBMStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Sun, Moon, LayoutDashboard, Activity, Layers, Wrench, AlertTriangle, Cpu, TrendingUp } from 'lucide-react';
import { useTheme } from 'next-themes';
import ExecutiveDashboard from '@/components/analytics/ExecutiveDashboard';
import DataExplorer from '@/components/analytics/DataExplorer';
import TimeAnalytics from '@/components/analytics/TimeAnalytics';
import PlantAnalytics from '@/components/analytics/PlantAnalytics';
import EquipmentAnalytics from '@/components/analytics/EquipmentAnalytics';
import HotspotAnalytics from '@/components/analytics/HotspotAnalytics';
import PredictiveAnalytics from '@/components/analytics/PredictiveAnalytics';
import DashboardFilters from './DashboardFilters';

export default function DashboardLayout() {
  const { setTheme, theme } = useTheme();
  const resetFilters = useCBMStore((state) => state.resetFilters);
  const [activeTab, setActiveTab] = useState('executive');

  const navItems = [
    { id: 'executive', label: 'Executive Summary', icon: LayoutDashboard },
    { id: 'time', label: 'Time Analytics', icon: Activity },
    { id: 'plant', label: 'Plant & Area', icon: Layers },
    { id: 'equipment', label: 'Equipment & Cause', icon: Wrench },
    { id: 'hotspot', label: 'Hotspots & Risk', icon: AlertTriangle },
    { id: 'predictive', label: 'Predictive & AI', icon: Cpu },
    { id: 'data', label: 'Data Explorer', icon: Layers },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              Vedanta CBM
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset Filters
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </div>
      </header>
      
      <DashboardFilters />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="w-64 border-r bg-muted/20 flex-shrink-0 hidden md:flex flex-col">
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === item.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'executive' && <ExecutiveDashboard />}
            {activeTab === 'data' && <DataExplorer />}
            {activeTab === 'time' && <TimeAnalytics />}
            {activeTab === 'plant' && <PlantAnalytics />}
            {activeTab === 'equipment' && <EquipmentAnalytics />}
            {activeTab === 'hotspot' && <HotspotAnalytics />}
            {activeTab === 'predictive' && <PredictiveAnalytics />}
            {activeTab !== 'executive' && activeTab !== 'data' && activeTab !== 'time' && activeTab !== 'plant' && activeTab !== 'equipment' && activeTab !== 'hotspot' && activeTab !== 'predictive' && (
              <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
                Module under construction.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
