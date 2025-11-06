"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TableWidgetProps {
  widget: any;
  data: { data: any[]; columns: string[] };
}

export default function TableWidget({ widget, data }: TableWidgetProps) {
  const { title } = widget;
  const { columns, data: rows } = data;

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <CardTitle>{title || "Data Table"}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-96">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col, index) => (
                  <TableHead key={index} className="font-semibold">
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((col, colIndex) => (
                    <TableCell key={colIndex}>
                      {row[col] !== null && row[col] !== undefined
                        ? String(row[col])
                        : "-"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="px-6 py-2 text-sm text-gray-500 border-t">
          Showing {rows.length} {rows.length === 1 ? "row" : "rows"}
        </div>
      </CardContent>
    </Card>
  );
}
