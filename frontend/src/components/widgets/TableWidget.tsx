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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isValid, parseISO } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  CalendarIcon,
} from "lucide-react";
import jsPDF from "jspdf";

interface ColumnFilter {
  column: string;
  type: "text" | "number" | "date" | "select";
  value: any;
  operator?:
    | "="
    | "!="
    | ">"
    | "<"
    | ">="
    | "<="
    | "contains"
    | "startsWith"
    | "endsWith"
    | "between";
  values?: any[]; // for between operator or multi-select
}

interface ConfigFilter {
  column: string;
  type?: "text" | "number" | "date" | "select";
  label?: string;
  defaultValue?: any;
  options?: string[] | "dynamic";
  operator?: string;
  operators?: string[];
  placeholder?: string;
  visible?: boolean;
}

interface TableWidgetProps {
  widget: any;
  data: { data: any[]; columns: string[] };
}

export default function TableWidget({ widget, data }: TableWidgetProps) {
  const {
    title,
    styleConfig = {},
    filterConfig = {},
    conditionalFormatting = [],
  } = widget;
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
  const [columnFilters, setColumnFilters] = useState<ColumnFilter[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [configFilters, setConfigFilters] = useState<{ [key: string]: any }>(
    {}
  );

  // Helper function to format cell values (especially dates)
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return "-";

    // Check if value looks like an ISO date string
    if (
      typeof value === "string" &&
      value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    ) {
      try {
        const date = parseISO(value);
        if (isValid(date)) {
          return format(date, "dd/MM/yyyy");
        }
      } catch {
        // If parsing fails, return original value
      }
    }

    return String(value);
  };

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

  // Extract filter config
  const {
    enabled: filtersEnabled = false,
    filters: configFilterDefs = [],
    showFilterBar = true,
  } = filterConfig as {
    enabled?: boolean;
    filters?: ConfigFilter[];
    showFilterBar?: boolean;
  };

  // Initialize config filters with default values
  const initialConfigFilters = useMemo(() => {
    if (configFilterDefs.length === 0) return {};

    const initialFilters: { [key: string]: any } = {};
    configFilterDefs.forEach((filter) => {
      if (filter.defaultValue !== undefined) {
        initialFilters[filter.column] = filter.defaultValue;
      }
    });
    return initialFilters;
  }, [configFilterDefs]);

  // Use initialized filters if configFilters is empty
  const activeConfigFilters =
    Object.keys(configFilters).length > 0
      ? configFilters
      : initialConfigFilters;

  // Apply config filters to data
  const filteredByConfigFilters = useMemo(() => {
    if (!filtersEnabled || Object.keys(activeConfigFilters).length === 0)
      return rows;

    return rows.filter((row) => {
      return Object.entries(activeConfigFilters).every(([column, value]) => {
        // Skip filtering if value is empty, null, undefined, or special __ALL__ value
        if (
          value === null ||
          value === undefined ||
          value === "" ||
          value === "__ALL__"
        )
          return true;

        const cellValue = row[column];
        if (cellValue == null) return false;

        const filterDef = configFilterDefs.find((f) => f.column === column);
        if (!filterDef) return true;

        const operator = filterDef.operator || "contains";
        const strValue = String(cellValue).toLowerCase();
        const filterValue = String(value).toLowerCase();

        switch (operator) {
          case "=":
          case "equals":
            return strValue === filterValue;
          case "!=":
          case "notEquals":
            return strValue !== filterValue;
          case "contains":
            return strValue.includes(filterValue);
          case "startsWith":
            return strValue.startsWith(filterValue);
          case "endsWith":
            return strValue.endsWith(filterValue);
          case ">":
            const num1 = parseFloat(cellValue);
            const filter1 = parseFloat(value);
            return !isNaN(num1) && !isNaN(filter1) && num1 > filter1;
          case "<":
            const num2 = parseFloat(cellValue);
            const filter2 = parseFloat(value);
            return !isNaN(num2) && !isNaN(filter2) && num2 < filter2;
          case ">=":
            const num3 = parseFloat(cellValue);
            const filter3 = parseFloat(value);
            return !isNaN(num3) && !isNaN(filter3) && num3 >= filter3;
          case "<=":
            const num4 = parseFloat(cellValue);
            const filter4 = parseFloat(value);
            return !isNaN(num4) && !isNaN(filter4) && num4 <= filter4;
          default:
            return true;
        }
      });
    });
  }, [rows, activeConfigFilters, configFilterDefs, filtersEnabled]);

  // Detect column types
  const getColumnType = (
    columnName: string
  ): "text" | "number" | "date" | "select" => {
    if (!rows.length) return "text";

    const sampleValues = rows
      .slice(0, 10)
      .map((row) => row[columnName])
      .filter((val) => val != null);
    if (!sampleValues.length) return "text";

    // Check for dates
    const dateRegex =
      /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}|^\d{2}-\d{2}-\d{4}/;
    if (sampleValues.some((val) => dateRegex.test(String(val)))) {
      return "date";
    }

    // Check for numbers
    const numbers = sampleValues.filter((val) => !isNaN(Number(val)));
    if (numbers.length > sampleValues.length * 0.8) {
      return "number";
    }

    // Check if suitable for select (limited unique values)
    const uniqueValues = new Set(sampleValues.map((val) => String(val)));
    if (
      uniqueValues.size <= 20 &&
      uniqueValues.size < sampleValues.length * 0.8
    ) {
      return "select";
    }

    return "text";
  };

  // Get unique values for select filters
  const getUniqueValues = (columnName: string) => {
    const uniqueValues = new Set(
      rows.map((row) => row[columnName]).filter((val) => val != null)
    );
    return Array.from(uniqueValues).sort();
  };

  // Apply filters
  const filteredByColumns = useMemo(() => {
    if (!columnFilters.length) return filteredByConfigFilters;

    return filteredByConfigFilters.filter((row) => {
      return columnFilters.every((filter) => {
        const cellValue = row[filter.column];
        if (cellValue == null) return false;

        const strValue = String(cellValue).toLowerCase();
        const filterValue = String(filter.value || "").toLowerCase();

        switch (filter.operator) {
          case "=":
            return strValue === filterValue;
          case "!=":
            return strValue !== filterValue;
          case "contains":
            return strValue.includes(filterValue);
          case "startsWith":
            return strValue.startsWith(filterValue);
          case "endsWith":
            return strValue.endsWith(filterValue);
          case ">":
            const numValue1 = parseFloat(cellValue);
            const numFilter1 = parseFloat(filter.value);
            return (
              !isNaN(numValue1) && !isNaN(numFilter1) && numValue1 > numFilter1
            );
          case "<":
            const numValue2 = parseFloat(cellValue);
            const numFilter2 = parseFloat(filter.value);
            return (
              !isNaN(numValue2) && !isNaN(numFilter2) && numValue2 < numFilter2
            );
          case ">=":
            const numValue3 = parseFloat(cellValue);
            const numFilter3 = parseFloat(filter.value);
            return (
              !isNaN(numValue3) && !isNaN(numFilter3) && numValue3 >= numFilter3
            );
          case "<=":
            const numValue4 = parseFloat(cellValue);
            const numFilter4 = parseFloat(filter.value);
            return (
              !isNaN(numValue4) && !isNaN(numFilter4) && numValue4 <= numFilter4
            );
          case "between":
            if (!filter.values || filter.values.length !== 2) return true;
            const numValue5 = parseFloat(cellValue);
            const min = parseFloat(filter.values[0]);
            const max = parseFloat(filter.values[1]);
            return (
              !isNaN(numValue5) &&
              !isNaN(min) &&
              !isNaN(max) &&
              numValue5 >= min &&
              numValue5 <= max
            );
          default:
            return true;
        }
      });
    });
  }, [filteredByConfigFilters, columnFilters]);

  // Search and filter logic
  const filteredData = useMemo(() => {
    if (!searchTerm) return filteredByColumns;

    return filteredByColumns.filter((row) =>
      columns.some((col) =>
        String(row[col] || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
    );
  }, [filteredByColumns, columns, searchTerm]);

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
    // Create proper Excel format using CSV with Excel-specific encoding
    const cleanTitle = (title || "data").replace(/[^\w\s-]/g, ""); // Remove special characters
    const csvContent = [
      columns.join(","),
      ...sortedData.map((row) =>
        columns
          .map((col) => {
            const value = String(row[col] || "");
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            if (
              value.includes(",") ||
              value.includes('"') ||
              value.includes("\n")
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      ),
    ].join("\n");

    // Use proper MIME type for Excel
    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cleanTitle}.csv`; // Use .csv extension instead of .xlsx
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const exportToPDF = async () => {
    try {
      // Convert oklch/lab colors to hex for html2canvas compatibility
      const hexHeaderBackground = headerBackground.startsWith("#")
        ? headerBackground
        : "#374151"; // fallback to gray-700
      const hexHeaderColor = headerColor.startsWith("#")
        ? headerColor
        : "#ffffff"; // fallback to white

      // Create a completely isolated iframe to avoid CSS inheritance
      const iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.left = "-9999px";
      iframe.style.width = "1200px";
      iframe.style.height = "2000px";
      document.body.appendChild(iframe);

      const iframeDoc =
        iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error("Cannot access iframe document");

      // Create table HTML with inline styles only (no CSS variables)
      const tableHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Noto Sans Thai', 'Tahoma', sans-serif; 
              background-color: #ffffff;
              color: #000000;
              padding: 20px;
            }
          </style>
        </head>
        <body>
          <div style="padding: 20px; background-color: #ffffff;">
            <h1 style="font-size: 24px; margin-bottom: 20px; font-family: 'Noto Sans Thai', 'Tahoma', sans-serif; color: #000000; font-weight: 700;">
              ${title || "Data Export"}
            </h1>
            <table style="width: 100%; border-collapse: collapse; font-family: 'Noto Sans Thai', 'Tahoma', sans-serif;">
              <thead>
                <tr style="background-color: ${hexHeaderBackground};">
                  ${columns
                    .map(
                      (col) =>
                        `<th style="border: 1px solid #dddddd; padding: 12px; color: ${hexHeaderColor}; font-weight: 700; text-align: left; font-family: 'Noto Sans Thai', 'Tahoma', sans-serif;">${col}</th>`
                    )
                    .join("")}
                </tr>
              </thead>
              <tbody>
                ${sortedData
                  .map(
                    (row, index) =>
                      `<tr style="background-color: ${
                        index % 2 === 0 ? "#f9f9f9" : "#ffffff"
                      };">
                        ${columns
                          .map(
                            (col) =>
                              `<td style="border: 1px solid #dddddd; padding: 10px; text-align: left; color: #000000; font-family: 'Noto Sans Thai', 'Tahoma', sans-serif;">${formatCellValue(
                                row[col]
                              )}</td>`
                          )
                          .join("")}
                      </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(tableHTML);
      iframeDoc.close();

      // Wait for fonts to load in iframe
      await iframeDoc.fonts.ready;

      // Small delay to ensure rendering
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Use html2canvas to capture the iframe content
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(iframeDoc.body, {
        scale: 1.5, // ลดจาก 2 เป็น 1.5 เพื่อลดขนาดไฟล์
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1200,
      });

      // Remove iframe
      document.body.removeChild(iframe);

      // Calculate PDF dimensions
      const pageWidth = columns.length > 6 ? 297 : 210; // A4 landscape/portrait
      const pageHeight = columns.length > 6 ? 210 : 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const doc = new jsPDF({
        orientation: columns.length > 6 ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
        compress: true, // เปิด compression
      });

      let position = 0;
      const imgData = canvas.toDataURL("image/jpeg", 0.85); // ใช้ JPEG แทน PNG และ quality 85%

      // Add first page
      doc.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      const cleanTitle = (title || "data").replace(/[^\w\s-]/g, "");
      doc.save(`${cleanTitle}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("เกิดข้อผิดพลาดในการสร้าง PDF กรุณาลองใหม่อีกครั้ง");
    }
  };

  // Get conditional formatting styles for a cell
  const getConditionalStyle = (field: string, value: any) => {
    const styles: React.CSSProperties = {};

    conditionalFormatting.forEach((rule: any) => {
      if (rule.field === field) {
        try {
          // Replace 'value' with the actual cell value in the condition
          const condition = rule.condition.replace(/value/g, String(value));

          // Safely evaluate the condition
          const isMatch = Function(`"use strict"; return (${condition})`)();

          if (isMatch && rule.style) {
            Object.assign(styles, rule.style);
          }
        } catch (error) {
          // If condition evaluation fails, skip this rule
          console.warn(
            "Invalid conditional formatting condition:",
            rule.condition,
            error
          );
        }
      }
    });

    return styles;
  };

  // Update config filter
  const updateConfigFilter = (column: string, value: any) => {
    setConfigFilters((prev) => ({
      ...prev,
      [column]: value,
    }));
  };

  // Clear config filter
  const clearConfigFilter = (column: string) => {
    setConfigFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[column];
      return newFilters;
    });
  };

  // Add column filter
  const addColumnFilter = (column: string) => {
    const type = getColumnType(column);
    const newFilter: ColumnFilter = {
      column,
      type,
      value: "",
      operator:
        type === "text"
          ? "contains"
          : type === "number"
          ? "="
          : type === "date"
          ? ">="
          : "=",
    };
    setColumnFilters((prev) => [...prev, newFilter]);
  };

  // Update column filter
  const updateColumnFilter = (
    index: number,
    updates: Partial<ColumnFilter>
  ) => {
    setColumnFilters((prev) =>
      prev.map((filter, i) =>
        i === index ? { ...filter, ...updates } : filter
      )
    );
  };

  // Remove column filter
  const removeColumnFilter = (index: number) => {
    setColumnFilters((prev) => prev.filter((_, i) => i !== index));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setColumnFilters([]);
    setSearchTerm("");
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

  // Render filter input based on type
  const renderFilterInput = (filter: ColumnFilter, index: number) => {
    const uniqueValues =
      filter.type === "select" ? getUniqueValues(filter.column) : [];

    return (
      <div
        key={index}
        className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg"
      >
        <div className="flex-1">
          <div className="text-xs font-medium text-gray-600 mb-1">
            {filter.column}
          </div>

          <div className="flex space-x-1">
            {/* Operator Select */}
            <Select
              value={filter.operator}
              onValueChange={(value) =>
                updateColumnFilter(index, { operator: value as any })
              }
            >
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filter.type === "text" && (
                  <>
                    <SelectItem value="contains">มี</SelectItem>
                    <SelectItem value="=">เท่ากับ</SelectItem>
                    <SelectItem value="!=">ไม่เท่า</SelectItem>
                    <SelectItem value="startsWith">ขึ้นต้น</SelectItem>
                    <SelectItem value="endsWith">ลงท้าย</SelectItem>
                  </>
                )}
                {filter.type === "number" && (
                  <>
                    <SelectItem value="=">=</SelectItem>
                    <SelectItem value="!=">≠</SelectItem>
                    <SelectItem value=">">{">"}</SelectItem>
                    <SelectItem value="<">{"<"}</SelectItem>
                    <SelectItem value=">=">{">="}</SelectItem>
                    <SelectItem value="<=">{"<="}</SelectItem>
                    <SelectItem value="between">ระหว่าง</SelectItem>
                  </>
                )}
                {filter.type === "date" && (
                  <>
                    <SelectItem value="=">วันที่</SelectItem>
                    <SelectItem value=">">หลังจาก</SelectItem>
                    <SelectItem value="<">ก่อน</SelectItem>
                    <SelectItem value="between">ช่วง</SelectItem>
                  </>
                )}
                {filter.type === "select" && (
                  <SelectItem value="=">เท่ากับ</SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* Value Input */}
            {filter.type === "select" ? (
              <Select
                value={filter.value}
                onValueChange={(value) => updateColumnFilter(index, { value })}
              >
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue placeholder="เลือก..." />
                </SelectTrigger>
                <SelectContent>
                  {uniqueValues.map((value, i) => (
                    <SelectItem key={i} value={String(value)}>
                      {String(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : filter.type === "date" ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 h-8 text-xs justify-start text-left"
                  >
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {filter.value
                      ? format(new Date(filter.value), "dd/MM/yyyy")
                      : "เลือกวันที่"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filter.value ? new Date(filter.value) : undefined}
                    onSelect={(date) =>
                      updateColumnFilter(index, {
                        value: date ? date.toISOString().split("T")[0] : "",
                      })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            ) : filter.operator === "between" ? (
              <div className="flex space-x-1 flex-1">
                <Input
                  placeholder="จาก"
                  className="h-8 text-xs"
                  value={filter.values?.[0] || ""}
                  onChange={(e) =>
                    updateColumnFilter(index, {
                      values: [e.target.value, filter.values?.[1] || ""],
                    })
                  }
                />
                <Input
                  placeholder="ถึง"
                  className="h-8 text-xs"
                  value={filter.values?.[1] || ""}
                  onChange={(e) =>
                    updateColumnFilter(index, {
                      values: [filter.values?.[0] || "", e.target.value],
                    })
                  }
                />
              </div>
            ) : (
              <Input
                placeholder="ค่า..."
                className="flex-1 h-8 text-xs"
                value={filter.value}
                onChange={(e) =>
                  updateColumnFilter(index, { value: e.target.value })
                }
              />
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeColumnFilter(index)}
          className="h-8 w-8 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  // Render config filter input
  const renderConfigFilterInput = (filter: ConfigFilter) => {
    const currentValue = configFilters[filter.column] || "";
    const uniqueValues =
      filter.options === "dynamic"
        ? getUniqueValues(filter.column)
        : filter.options;

    const filterType = filter.type || getColumnType(filter.column);

    // For select type, use __ALL__ as default if no value is set
    const selectValue =
      filterType === "select" ? currentValue || "__ALL__" : currentValue;

    return (
      <div key={filter.column} className="flex flex-col space-y-1">
        {filter.label && (
          <label className="text-xs font-medium text-gray-600">
            {filter.label}
          </label>
        )}

        <div className="flex items-center space-x-1">
          {filterType === "select" && uniqueValues ? (
            <Select
              value={selectValue}
              onValueChange={(value) =>
                updateConfigFilter(
                  filter.column,
                  value === "__ALL__" ? "" : value
                )
              }
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue
                  placeholder={
                    filter.placeholder ||
                    `เลือก ${filter.label || filter.column}...`
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">ทั้งหมด</SelectItem>
                {(uniqueValues as string[]).map((value, i) => (
                  <SelectItem key={i} value={String(value)}>
                    {String(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : filterType === "date" ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-8 text-xs justify-start text-left flex-1"
                >
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {currentValue
                    ? format(new Date(currentValue), "dd/MM/yyyy")
                    : filter.placeholder || "เลือกวันที่"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={currentValue ? new Date(currentValue) : undefined}
                  onSelect={(date) =>
                    updateConfigFilter(
                      filter.column,
                      date ? date.toISOString().split("T")[0] : ""
                    )
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          ) : (
            <Input
              placeholder={
                filter.placeholder || `กรอก ${filter.label || filter.column}...`
              }
              className="h-8 text-xs flex-1"
              value={currentValue}
              onChange={(e) =>
                updateConfigFilter(filter.column, e.target.value)
              }
            />
          )}

          {currentValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearConfigFilter(filter.column)}
              className="h-8 w-8 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full overflow-hidden flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{title || "Data Table"}</CardTitle>

          <div className="flex items-center space-x-2">
            {/* Filter Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-blue-50 border-blue-300" : ""}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters ({columnFilters.length})
            </Button>

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
                      Export as PDF
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
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

        {/* Config Filters */}
        {filtersEnabled && showFilterBar && configFilterDefs.length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">
                Quick Filters
              </h4>
              <div className="flex space-x-1">
                {Object.keys(activeConfigFilters).length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfigFilters({})}
                    className="text-xs h-6 px-2"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {configFilterDefs
                .filter((filter) => filter.visible !== false)
                .map((filter) => renderConfigFilterInput(filter))}
            </div>
          </div>
        )}

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Column Filters</h4>
              <div className="flex space-x-2">
                {columnFilters.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      + Add Filter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {columns.map((column) => (
                      <DropdownMenuItem
                        key={column}
                        onClick={() => addColumnFilter(column)}
                        disabled={columnFilters.some(
                          (f) => f.column === column
                        )}
                      >
                        {column}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Render active filters */}
            {columnFilters.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {columnFilters.map((filter, index) =>
                  renderFilterInput(filter, index)
                )}
              </div>
            )}

            {/* Filter Summary */}
            {(searchTerm || columnFilters.length > 0) && (
              <div className="text-xs text-gray-600 flex items-center space-x-4">
                <span>
                  แสดง {filteredData.length} จาก {rows.length} รายการ
                </span>
                {searchTerm && (
                  <span className="bg-blue-100 px-2 py-1 rounded text-blue-800">
                    Search: &quot;{searchTerm}&quot;
                  </span>
                )}
                {columnFilters.length > 0 && (
                  <span className="bg-green-100 px-2 py-1 rounded text-green-800">
                    {columnFilters.length} filter
                    {columnFilters.length > 1 ? "s" : ""} active
                  </span>
                )}
              </div>
            )}
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
                  {columns.map((col, colIndex) => {
                    const rawValue = row[col];
                    const cellValue = formatCellValue(rawValue);

                    const conditionalStyle =
                      conditionalFormatting?.enabled &&
                      conditionalFormatting.rules
                        ? getConditionalStyle(
                            rawValue,
                            conditionalFormatting.rules
                          )
                        : {};

                    return (
                      <TableCell
                        key={colIndex}
                        className={compact ? "py-1 px-2" : "py-2 px-4"}
                        style={conditionalStyle}
                      >
                        {cellValue}
                      </TableCell>
                    );
                  })}
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
