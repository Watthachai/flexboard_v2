/**
 * Dashboard Types and Interfaces
 * สำหรับจัดการ Dashboard Configuration, Widgets, และ Data Sources
 */

// ===== Data Source Types =====

export type DataSourceType =
  | "mssql"
  | "mysql"
  | "postgresql"
  | "oracle"
  | "mongodb"
  | "firestore"
  | "bigquery"
  | "rest_api"
  | "google_sheet";

export interface DataSourceConnection {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  schema?: string;

  // For API connections
  url?: string;
  apiKey?: string;
  headers?: Record<string, string>;

  // For Google Sheets
  spreadsheetId?: string;
  sheetName?: string;

  // SSL/TLS options
  ssl?: boolean;
  sslCert?: string;
}

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  connection: DataSourceConnection;

  // Metadata
  availableTables?: string[];
  lastTested?: Date | string;
  status: "connected" | "tested" | "error" | "untested";
  errorMessage?: string;

  // Timestamps
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: string;
}

// ===== Widget Types =====

export type WidgetType =
  | "bar"
  | "line"
  | "pie"
  | "doughnut"
  | "area"
  | "scatter"
  | "kpi"
  | "table"
  | "gauge"
  | "heatmap"
  | "funnel";

export type AggregationType = "sum" | "avg" | "count" | "min" | "max" | "none";

export interface WidgetPosition {
  x: number;
  y: number;
  w: number; // width (grid units)
  h: number; // height (grid units)
}

export interface DataConfig {
  // Query options
  query?: string;
  table?: string;

  // Field mappings
  xField?: string;
  yField?: string;
  field?: string; // for KPI
  labelField?: string;
  valueField?: string;

  // Aggregation
  aggregation?: AggregationType;
  groupBy?: string[];

  // Filters
  filters?: Array<{
    field: string;
    operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE" | "IN";
    value: any;
  }>;

  // Sorting
  orderBy?: Array<{
    field: string;
    direction: "ASC" | "DESC";
  }>;

  // Limit
  limit?: number;
}

export interface StyleConfig {
  color?: string;
  colors?: string[]; // for multi-series
  backgroundColor?: string;

  // Chart options
  showLegend?: boolean;
  showGrid?: boolean;
  showLabels?: boolean;
  showTooltip?: boolean;

  // Formatting
  numberFormat?: string; // e.g., "0,0.00"
  dateFormat?: string; // e.g., "DD/MM/YYYY"
  prefix?: string; // e.g., "$"
  suffix?: string; // e.g., "%"

  // Size
  fontSize?: number;
  fontWeight?: "normal" | "bold";
}

export interface Widget {
  id: string;
  title: string;
  type: WidgetType;
  description?: string;

  // Position in grid layout
  position: WidgetPosition;

  // Data configuration
  dataConfig: DataConfig;

  // Style configuration
  styleConfig?: StyleConfig;

  // Refresh settings
  refreshInterval?: number; // seconds, 0 = no auto-refresh

  // Visibility
  visible?: boolean;
}

// ===== Dashboard Types =====

export type DashboardStatus = "draft" | "active" | "archived";
export type DashboardVisibility = "private" | "public" | "org";
export type LayoutType = "grid" | "single-page" | "custom";

export interface DashboardMetadata {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  visibility?: DashboardVisibility;
  layoutType?: LayoutType;
  theme?: "light" | "dark" | "auto";
}

export interface DashboardConfig {
  layout: LayoutType;
  theme: "light" | "dark" | "auto";

  // Grid settings
  gridCols?: number;
  gridRowHeight?: number;

  // Widgets
  widgets: Widget[];

  // Global settings
  autoRefresh?: boolean;
  refreshInterval?: number; // seconds

  // Filters (global dashboard filters)
  globalFilters?: Array<{
    id: string;
    label: string;
    field: string;
    type: "date" | "select" | "text" | "number";
    defaultValue?: any;
  }>;
}

export interface Dashboard {
  id: string;
  tenantId: string;

  // Metadata
  name: string;
  description?: string;
  category?: string;
  tags?: string[];

  // Current active version
  currentVersion: string;

  // Data Source
  dataSourceId: string;
  dataSource?: DataSource; // populated
  selectedTable?: string; // Selected table for this dashboard

  // Status
  status: DashboardStatus;
  visibility?: DashboardVisibility;

  // Timestamps
  createdAt: Date | string;
  createdBy: string;
  updatedAt: Date | string;
  updatedBy?: string;
}

export interface DashboardVersion {
  id: string;
  dashboardId: string;
  versionNumber: string; // e.g., "1.0.0", "1.0.1"

  // Full configuration for this version
  config: DashboardConfig;

  // Version metadata
  changeLog?: string;
  publishedAt: Date | string;
  publishedBy: string;

  // Status
  isActive: boolean;
}

// ===== Request/Response Types =====

export interface CreateDashboardRequest {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  dataSourceId: string;
  config: DashboardConfig;
}

export interface UpdateDashboardRequest {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  status?: DashboardStatus;
  visibility?: DashboardVisibility;
  dataSourceId?: string;
  selectedTable?: string;
  currentVersion?: string;
}

export interface CreateVersionRequest {
  config: DashboardConfig;
  changeLog?: string;
}

export interface TestConnectionRequest {
  type: DataSourceType;
  connection: DataSourceConnection;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  availableTables?: string[];
}

export interface GetTablesResponse {
  tables: Array<{
    name: string;
    schema?: string;
    rowCount?: number;
  }>;
}

export interface GetColumnsRequest {
  dataSourceId: string;
  table: string;
}

export interface GetColumnsResponse {
  columns: Array<{
    name: string;
    type: string;
    nullable?: boolean;
  }>;
}

export interface ExecuteQueryRequest {
  dataSourceId: string;
  query: string;
  limit?: number;
}

export interface ExecuteQueryResponse {
  data: any[];
  columns: string[];
  rowCount: number;
  executionTime?: number;
}

// ===== Form Types (for Wizard) =====

export interface DashboardFormStep1 {
  name: string;
  description: string;
  category: string;
  tags: string[];
}

export interface DashboardFormStep2 {
  dataSourceType: DataSourceType;
  dataSourceName: string;
  connection: DataSourceConnection;
}

export interface DashboardFormStep3 {
  selectedTable?: string;
  customQuery?: string;
  previewData?: any[];
}

export interface DashboardFormStep4 {
  widgets: Widget[];
}

export interface DashboardFormData {
  step1: DashboardFormStep1;
  step2: DashboardFormStep2;
  step3: DashboardFormStep3;
  step4: DashboardFormStep4;
}
