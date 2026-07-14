"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CNDataRecord } from "@/types";
import { Badge } from "@/components/ui/badge";
import dayjs from "dayjs";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export const columns: ColumnDef<CNDataRecord>[] = [
  {
    accessorKey: "notification",
    header: "Notification",
    cell: ({ row }) => <div className="font-medium">{row.getValue("notification")}</div>,
  },
  {
    accessorKey: "plantName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Plant
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "area",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Area
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "equipment",
    header: "Equipment",
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "causeCode",
    header: "Cause",
  },
  {
    accessorKey: "notificationDate",
    header: "Created On",
    cell: ({ row }) => {
      const date = row.getValue("notificationDate");
      return <div>{date ? dayjs(date as string).format('DD MMM YYYY') : '-'}</div>;
    }
  },
  {
    accessorKey: "ageing",
    header: "Ageing (Days)",
  },
  {
    accessorKey: "isOpen",
    header: "Status",
    cell: ({ row }) => {
      const isOpen = row.getValue("isOpen");
      return (
        <Badge variant={isOpen ? "destructive" : "default"}>
          {isOpen ? "Open" : "Closed"}
        </Badge>
      );
    }
  },
];
