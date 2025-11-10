"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface TableWidgetProps {
  widget: any;
  data: { data: any[]; columns: string[] };
}

export default function TableWidget({ widget, data }: TableWidgetProps) {
  const { title, styleConfig = {} } = widget;
  const { columns, data: rows } = data;

  // State for table functionality
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc" | null;
  }>({
    key: "",
    direction: null,
  });

  // Extract style config with defaults
  const {
    showPagination = true,
    pageSize = 20,
    pageSizeOptions = [10, 20, 50, 100],
    showSearch = true,
    showExport = true,
    exportFormats = ["csv", "excel", "pdf"],
    striped = true,
    bordered = true,
    hoverable = true,
    compact = false,
    headerBackground = "#374151",
    headerColor = "#fff",
  } = styleConfig;

  // Search and filter logic
  const filteredData = useMemo(() => {
    if (!searchTerm) return rows;

    return rows.filter((row) =>
      columns.some((col) =>
        String(row[col] || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
    );
  }, [rows, columns, searchTerm]);

  // Sort logic
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const aStr = String(aVal);
      const bStr = String(bVal);

      // Check if it's a number
      const aNum = parseFloat(aStr);
      const bNum = parseFloat(bStr);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
      }

      // String comparison
      const result = aStr.localeCompare(bStr);
      return sortConfig.direction === "asc" ? result : -result;
    });
  }, [filteredData, sortConfig]);

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = showPagination
    ? sortedData.slice(startIndex, endIndex)
    : sortedData;

  // Sort handler
  const handleSort = (columnKey: string) => {
    setSortConfig((prev) => ({
      key: columnKey,
      direction:
        prev.key === columnKey && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Export functions
  const exportToCSV = () => {
    const csvContent = [
      columns.join(","),
      ...sortedData.map((row) =>
        columns.map((col) => `"${row[col] || ""}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "data"}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const exportToExcel = () => {
    // Simple TSV export (can be opened in Excel)
    const tsvContent = [
      columns.join("\t"),
      ...sortedData.map((row) =>
        columns.map((col) => String(row[col] || "")).join("\t")
      ),
    ].join("\n");

    const blob = new Blob([tsvContent], { type: "application/vnd.ms-excel" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "data"}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const exportToPDF = () => {
    // Simple HTML export that can be printed/saved as PDF
    const htmlContent = `
      <html>
        <head>
          <title>${title || "Data Export"}</title>
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>${title || "Data Export"}</h1>
          <table>
            <thead>
              <tr>${columns.map((col) => `<th>${col}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${sortedData
                .map(
                  (row) =>
                    `<tr>${columns
                      .map((col) => `<td>${row[col] || ""}</td>`)
                      .join("")}</tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "data"}.html`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const getSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey)
      return <ArrowUpDown className="h-4 w-4 ml-1" />;
    if (sortConfig.direction === "asc")
      return <ArrowUp className="h-4 w-4 ml-1" />;
    if (sortConfig.direction === "desc")
      return <ArrowDown className="h-4 w-4 ml-1" />;
    return <ArrowUpDown className="h-4 w-4 ml-1" />;
  };

  return (
    <Card className="h-full overflow-hidden flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{title || "Data Table"}</CardTitle>

          {/* Export Options */}
          {showExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {exportFormats.includes("csv") && (
                  <DropdownMenuItem onClick={exportToCSV}>
                    Export as CSV
                  </DropdownMenuItem>
                )}
                {exportFormats.includes("excel") && (
                  <DropdownMenuItem onClick={exportToExcel}>
                    Export as Excel
                  </DropdownMenuItem>
                )}
                {exportFormats.includes("pdf") && (
                  <DropdownMenuItem onClick={exportToPDF}>
                    Export as HTML
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="flex items-center space-x-2 mt-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="ค้นหา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: headerBackground }}>
                {columns.map((col, index) => (
                  <TableHead
                    key={index}
                    className={`font-semibold cursor-pointer hover:bg-opacity-80 ${
                      hoverable ? "hover:bg-gray-700" : ""
                    }`}
                    style={{ color: headerColor }}
                    onClick={() => handleSort(col)}
                  >
                    <div className="flex items-center justify-between">
                      {col}
                      {getSortIcon(col)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  className={`
                    ${striped && rowIndex % 2 === 0 ? "bg-gray-50" : ""}
                    ${hoverable ? "hover:bg-gray-100" : ""}
                    ${bordered ? "border-b" : ""}
                    ${compact ? "text-sm" : ""}
                  `}
                >
                  {columns.map((col, colIndex) => (
                    <TableCell
                      key={colIndex}
                      className={compact ? "py-1 px-2" : "py-2 px-4"}
                    >
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

        {/* Pagination */}
        {showPagination && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                แสดง {startIndex + 1} - {Math.min(endIndex, sortedData.length)}{" "}
                จาก {sortedData.length} รายการ
              </span>
              <Select
                value={pageSize.toString()}
                onValueChange={() => {
                  setCurrentPage(1); // Reset to first page when changing page size
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((size: number) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                ก่อนหน้า
              </Button>

              <span className="text-sm">
                หน้า {currentPage} จาก {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                ถัดไป
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Status Bar without Pagination */}
        {!showPagination && (
          <div className="px-6 py-2 text-sm text-gray-500 border-t">
            แสดง {sortedData.length}{" "}
            {sortedData.length === 1 ? "รายการ" : "รายการ"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
