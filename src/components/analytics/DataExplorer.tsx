"use client";

import React from 'react';
import { useCBMStore } from '@/store';
import { DataTable } from '@/components/table/DataTable';
import { columns } from '@/components/table/columns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DataExplorer() {
  const data = useCBMStore((state) => state.filteredData);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Raw Data Explorer</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={data} />
      </CardContent>
    </Card>
  );
}
