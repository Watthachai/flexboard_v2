"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Filter, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { DateRange } from "react-day-picker";

export interface GlobalFilter {
  id: string;
  type: "dateRange" | "dropdown" | "multiSelect" | "text" | "number";
  field: string;
  label: string;
  options?: string[] | "dynamic";
  defaultValue?: any;
  allowAll?: boolean;
  position?: { x: number; y: number; w: number; h: number };
}

export interface GlobalFilterValues {
  [filterId: string]: any;
}

interface GlobalFiltersProps {
  filters: GlobalFilter[];
  values: GlobalFilterValues;
  onChange: (values: GlobalFilterValues) => void;
  dynamicOptions?: { [field: string]: string[] };
  onReset?: () => void;
}

export default function GlobalFilters({
  filters,
  values,
  onChange,
  dynamicOptions = {},
  onReset,
}: GlobalFiltersProps) {
  const handleFilterChange = (filterId: string, value: any) => {
    onChange({
      ...values,
      [filterId]: value,
    });
  };

  const handleReset = () => {
    // Reset to default values
    const defaultValues: GlobalFilterValues = {};
    filters.forEach((filter) => {
      if (filter.defaultValue !== undefined) {
        defaultValues[filter.id] = filter.defaultValue;
      }
    });
    onChange(defaultValues);
    onReset?.();
  };

  const activeFiltersCount = useMemo(() => {
    return Object.values(values).filter(
      (v) => v !== undefined && v !== null && v !== "" && v !== "__ALL__"
    ).length;
  }, [values]);

  const renderFilter = (filter: GlobalFilter) => {
    const currentValue = values[filter.id];

    switch (filter.type) {
      case "dateRange":
        return (
          <div key={filter.id} className="flex flex-col space-y-1.5">
            <Label className="text-xs font-medium text-gray-600">
              {filter.label}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 justify-start text-left font-normal text-sm"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {currentValue?.start && currentValue?.end ? (
                    <>
                      {format(new Date(currentValue.start), "dd MMM yyyy", {
                        locale: th,
                      })}{" "}
                      -{" "}
                      {format(new Date(currentValue.end), "dd MMM yyyy", {
                        locale: th,
                      })}
                    </>
                  ) : (
                    <span className="text-gray-400">เลือกช่วงวันที่</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={
                    currentValue?.start
                      ? new Date(currentValue.start)
                      : new Date()
                  }
                  selected={{
                    from: currentValue?.start
                      ? new Date(currentValue.start)
                      : undefined,
                    to: currentValue?.end
                      ? new Date(currentValue.end)
                      : undefined,
                  }}
                  onSelect={(range: DateRange | undefined) => {
                    handleFilterChange(filter.id, {
                      start: range?.from?.toISOString().split("T")[0],
                      end: range?.to?.toISOString().split("T")[0],
                    });
                  }}
                  numberOfMonths={2}
                  locale={th}
                />
              </PopoverContent>
            </Popover>
          </div>
        );

      case "dropdown":
        const dropdownOptions =
          filter.options === "dynamic"
            ? dynamicOptions[filter.field] || []
            : filter.options || [];

        return (
          <div key={filter.id} className="flex flex-col space-y-1.5">
            <Label className="text-xs font-medium text-gray-600">
              {filter.label}
            </Label>
            <Select
              value={currentValue || "__ALL__"}
              onValueChange={(value) =>
                handleFilterChange(
                  filter.id,
                  value === "__ALL__" ? undefined : value
                )
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={`เลือก${filter.label}...`} />
              </SelectTrigger>
              <SelectContent>
                {filter.allowAll !== false && (
                  <SelectItem value="__ALL__">ทั้งหมด</SelectItem>
                )}
                {dropdownOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "multiSelect":
        const multiOptions =
          filter.options === "dynamic"
            ? dynamicOptions[filter.field] || []
            : filter.options || [];
        const selectedValues: string[] = currentValue || [];

        return (
          <div key={filter.id} className="flex flex-col space-y-1.5">
            <Label className="text-xs font-medium text-gray-600">
              {filter.label}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 justify-start text-left font-normal text-sm"
                >
                  {selectedValues.length > 0 ? (
                    <div className="flex items-center gap-1 overflow-hidden">
                      <Badge variant="secondary" className="text-xs">
                        {selectedValues.length} selected
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-gray-400">
                      เลือก{filter.label}...
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-2 max-h-60 overflow-auto">
                  {multiOptions.map((option) => (
                    <label
                      key={option}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.includes(option)}
                        onChange={(e) => {
                          const newValues = e.target.checked
                            ? [...selectedValues, option]
                            : selectedValues.filter((v) => v !== option);
                          handleFilterChange(filter.id, newValues);
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{option}</span>
                    </label>
                  ))}
                </div>
                {selectedValues.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-xs"
                    onClick={() => handleFilterChange(filter.id, [])}
                  >
                    ล้างการเลือก
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          </div>
        );

      case "text":
        return (
          <div key={filter.id} className="flex flex-col space-y-1.5">
            <Label className="text-xs font-medium text-gray-600">
              {filter.label}
            </Label>
            <Input
              type="text"
              placeholder={`ค้นหา${filter.label}...`}
              value={currentValue || ""}
              onChange={(e) => handleFilterChange(filter.id, e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        );

      case "number":
        return (
          <div key={filter.id} className="flex flex-col space-y-1.5">
            <Label className="text-xs font-medium text-gray-600">
              {filter.label}
            </Label>
            <Input
              type="number"
              placeholder={filter.label}
              value={currentValue || ""}
              onChange={(e) =>
                handleFilterChange(
                  filter.id,
                  e.target.value ? parseFloat(e.target.value) : undefined
                )
              }
              className="h-9 text-sm"
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (!filters || filters.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Global Filters
          </span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFiltersCount} active
            </Badge>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filters.map(renderFilter)}
      </div>
    </div>
  );
}
