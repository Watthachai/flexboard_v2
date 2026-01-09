"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  MoreHorizontal,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toast } from "sonner";
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
  tenantId?: string;
}

export default function TableWidget({
  widget,
  data,
  tenantId,
}: TableWidgetProps) {
  const {
    title,
    styleConfig = {},
    filterConfig = {},
    conditionalFormatting = [],
  } = widget;
  const { columns, data: rows } = data;

  // Extract style config with defaults
  const {
    showPagination = true,
    pageSize: defaultPageSize = 20,
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
    selectable = false,
    bulkActions = [],
    rowActions = [],
  } = styleConfig;

  // State for table functionality
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
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

  // Selection state
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{
    action: any;
    rows: any[];
    message?: string;
  } | null>(null);
  const [apiTokens, setApiTokens] = useState<{ [key: string]: string }>({});

  // Fetch API tokens from tenant settings
  // Note: API tokens are stored in Cloud Backend, uses OnPrem API with API Key auth
  useEffect(() => {
    const fetchApiTokens = async () => {
      if (!tenantId) return;

      try {
        // Get API Key from localStorage
        const apiKey =
          typeof window !== "undefined" ? localStorage.getItem("apiKey") : null;

        if (!apiKey) {
          console.warn("No API key found, skipping API tokens fetch");
          return;
        }

        // Use Cloud Backend URL with OnPrem API endpoint (uses API Key auth)
        const cloudBackendUrl =
          process.env.NEXT_PUBLIC_CLOUD_BACKEND_URL ||
          "https://api.fittflexb.com";

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
          "X-Tenant-ID": tenantId,
        };

        // Use OnPrem endpoint that accepts API Key auth
        const response = await fetch(
          `${cloudBackendUrl}/api/onprem/api-tokens`,
          { headers }
        );

        if (!response.ok) {
          console.warn("Failed to fetch API tokens:", response.status);
          return;
        }

        const data = await response.json();
        const tokens: { [key: string]: string } = {};

        // Fetch each token value
        for (const tokenName of data.tokens) {
          const tokenResponse = await fetch(
            `${cloudBackendUrl}/api/onprem/api-tokens/${tokenName}`,
            { headers }
          );
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            tokens[tokenName] = tokenData.token;
          }
        }

        console.log("📦 API tokens loaded:", Object.keys(tokens));
        setApiTokens(tokens);
      } catch (error) {
        console.error("Error fetching API tokens:", error);
      }
    };

    fetchApiTokens();
  }, [tenantId]);

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
    configFilterDefs.forEach((filter, index) => {
      const filterKey = `${index}-${filter.column}`;
      if (filter.defaultValue !== undefined) {
        initialFilters[filterKey] = filter.defaultValue;
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
      return Object.entries(activeConfigFilters).every(([key, value]) => {
        // Extract column name from key (format: "index-columnName")
        const column = key.split("-").slice(1).join("-");

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

        // Find the filter definition by key
        const filterIndex = parseInt(key.split("-")[0]);
        const filterDef = configFilterDefs[filterIndex];
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
          case "<":
          case ">=":
          case "<=": {
            // Try numeric comparison first
            const num = parseFloat(cellValue);
            const filterNum = parseFloat(value);

            // If both are valid numbers, compare as numbers
            if (!isNaN(num) && !isNaN(filterNum)) {
              switch (operator) {
                case ">":
                  return num > filterNum;
                case "<":
                  return num < filterNum;
                case ">=":
                  return num >= filterNum;
                case "<=":
                  return num <= filterNum;
              }
            }

            // Try to parse as date (support dd/MM/yyyy format)
            const parseDateValue = (val: any): Date | null => {
              if (!val) return null;
              const str = String(val).trim();

              // Only parse as date if it looks like a date format
              // Skip pure numbers to avoid treating year numbers as dates
              if (/^\d+$/.test(str)) return null;

              // Try dd/MM/yyyy format
              const ddMMyyyyMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
              if (ddMMyyyyMatch) {
                const [, day, month, year] = ddMMyyyyMatch;
                return new Date(
                  parseInt(year),
                  parseInt(month) - 1,
                  parseInt(day)
                );
              }

              // Try ISO format (yyyy-MM-dd)
              const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
              if (isoMatch) {
                const date = new Date(str);
                return isNaN(date.getTime()) ? null : date;
              }

              return null;
            };

            const cellDate = parseDateValue(cellValue);
            const filterDate = parseDateValue(value);

            if (cellDate && filterDate) {
              // Compare as dates
              const cellTime = cellDate.getTime();
              const filterTime = filterDate.getTime();

              switch (operator) {
                case ">":
                  return cellTime > filterTime;
                case "<":
                  return cellTime < filterTime;
                case ">=":
                  return cellTime >= filterTime;
                case "<=":
                  return cellTime <= filterTime;
              }
            }

            return false;
          }
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

  // Update config filter (now accepts filterKey instead of column)
  const updateConfigFilter = (filterKey: string, value: any) => {
    setConfigFilters((prev) => ({
      ...prev,
      [filterKey]: value,
    }));
  };

  // Clear config filter (now accepts filterKey instead of column)
  const clearConfigFilter = (filterKey: string) => {
    setConfigFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[filterKey];
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

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
    } else {
      const allIndices = paginatedData.map((_, idx) => startIndex + idx);
      setSelectedRows(new Set(allIndices));
    }
  };

  const toggleRowSelection = (rowIndex: number) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(rowIndex)) {
      newSelection.delete(rowIndex);
    } else {
      newSelection.add(rowIndex);
    }
    setSelectedRows(newSelection);
  };

  const getSelectedRowsData = () => {
    return Array.from(selectedRows).map((index) => sortedData[index]);
  };

  // Replace template variables in string
  const replaceTemplateVars = async (
    template: string,
    row: any,
    allRows?: any[]
  ) => {
    let result = template;

    // Replace ${row.field} with actual row values
    result = result.replace(/\$\{row\.(\w+)\}/g, (_, field) => {
      const value = row[field];
      // Escape quotes and backslashes for JSON safety
      if (typeof value === "string") {
        return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      }
      return value !== undefined ? String(value) : "";
    });

    // Replace ${TOKEN:name} with API token from tenant settings
    result = result.replace(/\$\{TOKEN:(\w+)\}/g, (_, tokenName) => {
      return apiTokens[tokenName] || "";
    });

    // Replace ${API_TOKEN} - try tenant settings first, then env variable
    result = result.replace(/\$\{API_TOKEN\}/g, () => {
      // Check if there's a default token in tenant settings
      return (
        apiTokens["default"] ||
        apiTokens["fittbsa"] ||
        process.env.NEXT_PUBLIC_API_TOKEN ||
        ""
      );
    });

    // Replace ${NEXT_PUBLIC_*} environment variables
    result = result.replace(/\$\{(NEXT_PUBLIC_\w+)\}/g, (_, envVar) => {
      const envValue = process.env[envVar];
      return envValue || "";
    });

    // Replace ${appliedFilters} with current filter state
    result = result.replace(
      /\$\{appliedFilters\}/g,
      JSON.stringify(activeConfigFilters)
    );

    // Replace ${timestamp} with current timestamp
    result = result.replace(/\$\{timestamp\}/g, new Date().toISOString());

    // Replace ${dashboardId} if available
    result = result.replace(/\$\{dashboardId\}/g, widget.id || "");

    // Replace ${count} with number of rows
    if (allRows) {
      result = result.replace(/\{count\}/g, String(allRows.length));
    }

    return result;
  };

  // Build payload with proper template variable replacement
  const buildPayload = async (
    template: any,
    row: any,
    allRows: any[]
  ): Promise<any> => {
    if (template === null || template === undefined) {
      return template;
    }

    // Handle string values with template variables
    if (typeof template === "string") {
      // Check for special variables that need object/array replacement
      if (template === "${selectedRows}") {
        return allRows;
      }
      if (template === "${appliedFilters}") {
        return activeConfigFilters;
      }
      if (template === "${timestamp}") {
        return new Date().toISOString();
      }
      if (template === "${dashboardId}") {
        return widget.id || "";
      }

      // Check for ${row.field} patterns
      const rowFieldMatch = template.match(/^\$\{row\.(\w+)\}$/);
      if (rowFieldMatch) {
        return row[rowFieldMatch[1]];
      }

      // Otherwise, replace inline variables in string
      return await replaceTemplateVars(template, row, allRows);
    }

    // Handle arrays
    if (Array.isArray(template)) {
      return await Promise.all(
        template.map((item) => buildPayload(item, row, allRows))
      );
    }

    // Handle objects
    if (typeof template === "object") {
      const result: any = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = await buildPayload(value, row, allRows);
      }
      return result;
    }

    // Return primitive values as-is
    return template;
  };

  // Execute bulk action
  const executeBulkAction = async (action: any) => {
    const selectedData = getSelectedRowsData();

    if (selectedData.length === 0) {
      toast.error("กรุณาเลือกข้อมูลอย่างน้อย 1 รายการ");
      return;
    }

    // Show confirmation dialog if configured
    if (action.confirmMessage) {
      const message = await replaceTemplateVars(
        action.confirmMessage,
        {},
        selectedData
      );
      setConfirmAction({ action, rows: selectedData, message });
      return;
    }

    await performApiCall(action, selectedData);
  };

  // Execute row action
  const executeRowAction = async (action: any, row: any) => {
    if (action.type === "navigation") {
      const url = await replaceTemplateVars(action.url, row);
      window.location.href = url;
      return;
    }

    await performApiCall(action, [row]);
  };

  // Perform API call
  const performApiCall = async (action: any, rows: any[]) => {
    try {
      const { apiConfig } = action;

      // Replace variables in URL
      let url = apiConfig.url;
      if (rows.length === 1) {
        url = await replaceTemplateVars(url, rows[0]);
      }

      // Replace variables in headers
      const headers: any = {};
      if (apiConfig.headers) {
        for (const [key, value] of Object.entries(apiConfig.headers)) {
          headers[key] = await replaceTemplateVars(String(value), {}, rows);
        }
      }

      // Build payload from template with proper variable replacement
      let payload = {};
      if (apiConfig.payloadTemplate) {
        payload = await buildPayload(apiConfig.payloadTemplate, rows[0], rows);
      }

      // Make API call
      const response = await fetch(url, {
        method: apiConfig.method || "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      // Show success message
      const successMsg = action.successMessage
        ? await replaceTemplateVars(action.successMessage, {}, rows)
        : `ดำเนินการสำเร็จ ${rows.length} รายการ`;
      toast.success(successMsg);

      // Clear selection after successful bulk action
      if (rows.length > 1) {
        setSelectedRows(new Set());
      }
    } catch (error) {
      console.error("API call failed:", error);
      const errorMsg = action.errorMessage || "เกิดข้อผิดพลาดในการดำเนินการ";
      toast.error(errorMsg);
    } finally {
      setConfirmAction(null);
    }
  };

  // Get icon component from icon name
  const getIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[
      iconName
        .split("-")
        .map((part, i) =>
          i === 0
            ? part.charAt(0).toUpperCase() + part.slice(1)
            : part.charAt(0).toUpperCase() + part.slice(1)
        )
        .join("")
    ];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
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
  const renderConfigFilterInput = (filter: ConfigFilter, index: number) => {
    // Create unique key using index and column name
    const filterKey = `${index}-${filter.column}`;
    const currentValue = configFilters[filterKey] || "";

    const uniqueValues =
      filter.options === "dynamic"
        ? getUniqueValues(filter.column)
        : filter.options;

    const filterType = filter.type || getColumnType(filter.column);

    // For select type, use __ALL__ as default if no value is set
    const selectValue =
      filterType === "select" ? currentValue || "__ALL__" : currentValue;

    return (
      <div key={filterKey} className="flex flex-col space-y-1">
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
                updateConfigFilter(filterKey, value === "__ALL__" ? "" : value)
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
                  className="h-9 text-xs justify-start text-left flex-1 font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {currentValue
                    ? format(new Date(currentValue), "dd/MM/yyyy")
                    : filter.placeholder || "เลือกวันที่"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={currentValue ? new Date(currentValue) : undefined}
                  onSelect={(date) =>
                    updateConfigFilter(
                      filterKey,
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
              onChange={(e) => updateConfigFilter(filterKey, e.target.value)}
            />
          )}

          {currentValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearConfigFilter(filterKey)}
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

        {/* Bulk Actions Toolbar */}
        {selectable && selectedRows.size > 0 && bulkActions.length > 0 && (
          <div className="flex items-center justify-between mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm font-medium text-blue-700">
              เลือกแล้ว {selectedRows.size} รายการ
            </span>
            <div className="flex items-center space-x-2">
              {bulkActions.map((action: any) => (
                <Button
                  key={action.id}
                  size="sm"
                  variant="outline"
                  onClick={() => executeBulkAction(action)}
                  className="bg-white"
                >
                  {action.icon && getIcon(action.icon)}
                  <span className="ml-2">{action.label}</span>
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedRows(new Set())}
              >
                ยกเลิก
              </Button>
            </div>
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
                .map((filter, index) => renderConfigFilterInput(filter, index))}
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
        <div className="overflow-auto flex-1 max-h-[400px]">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow style={{ backgroundColor: headerBackground }}>
                {/* Checkbox column */}
                {selectable && (
                  <TableHead className="w-12" style={{ color: headerColor }}>
                    <Checkbox
                      checked={
                        selectedRows.size === paginatedData.length &&
                        paginatedData.length > 0
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                )}

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

                {/* Row actions header */}
                {rowActions.length > 0 && (
                  <TableHead className="w-12" style={{ color: headerColor }}>
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row, rowIndex) => {
                const actualRowIndex = startIndex + rowIndex;
                const isSelected = selectedRows.has(actualRowIndex);

                return (
                  <TableRow
                    key={rowIndex}
                    className={`
                      ${striped && rowIndex % 2 === 0 ? "bg-gray-50" : ""}
                      ${hoverable ? "hover:bg-gray-100" : ""}
                      ${bordered ? "border-b" : ""}
                      ${compact ? "text-sm" : ""}
                      ${isSelected ? "bg-blue-50" : ""}
                    `}
                  >
                    {/* Checkbox cell */}
                    {selectable && (
                      <TableCell className="w-12">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() =>
                            toggleRowSelection(actualRowIndex)
                          }
                        />
                      </TableCell>
                    )}

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

                    {/* Row actions cell */}
                    {rowActions.length > 0 && (
                      <TableCell className="w-12">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {rowActions.map((action: any) => (
                              <DropdownMenuItem
                                key={action.id}
                                onClick={() => executeRowAction(action, row)}
                              >
                                {action.icon && getIcon(action.icon)}
                                <span className="ml-2">{action.label}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
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
                onValueChange={(value) => {
                  setPageSize(Number(value));
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

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการดำเนินการ</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction) {
                  performApiCall(confirmAction.action, confirmAction.rows);
                }
              }}
            >
              ยืนยัน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
