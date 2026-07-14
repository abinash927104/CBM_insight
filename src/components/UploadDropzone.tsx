"use client";

import React, { useState, useCallback } from 'react';
import { useCBMStore } from '@/store';
import { parseFile } from '@/lib/data/parser';
import { UploadCloud, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export default function UploadDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const setData = useCBMStore((state) => state.setData);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    try {
      setIsProcessing(true);
      const rawData = await parseFile(file);
      setData(rawData);
      toast.success(`Successfully processed ${rawData.length} records`, {
        description: 'Dashboard is ready.',
      });
    } catch (error: any) {
      console.error('File parsing error', error);
      toast.error('Failed to parse file', {
        description: error.message || 'Please upload a valid SAP CN Excel/CSV export.',
      });
    } finally {
      setIsProcessing(false);
      setIsDragging(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-2xl border-dashed border-2 shadow-sm">
        <CardContent 
          className={`p-12 flex flex-col items-center justify-center transition-colors duration-200 ease-in-out ${
            isDragging ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h3 className="text-xl font-semibold">Processing Data...</h3>
              <p className="text-sm text-muted-foreground text-center">
                This might take a few moments depending on the file size.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-6">
              <div className="p-4 bg-primary/10 rounded-full">
                <UploadCloud className="h-12 w-12 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold tracking-tight">Upload SAP CN Data</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Drag and drop your Excel or CSV file here, or click to browse. We support single or multi-month exports.
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <Button onClick={() => document.getElementById('file-upload')?.click()} variant="default" size="lg">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Select File
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileInput}
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md mt-4">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>All parsing and processing happens locally in your browser.</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
