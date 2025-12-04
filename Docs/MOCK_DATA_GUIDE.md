# Mock Data Feature Guide

## Overview

The Mock Data feature allows you to import SQL INSERT statements or JSON arrays as mock datasets for dashboard design and demonstrations. This enables you to:

- 🎨 Design dashboards without live database connections
- 🎯 Create demos with sample data
- 🚀 Develop and test without database setup
- 🔄 Gradually transition from mock to live data

## Features

### Upload Mock Data

- **SQL Support**: Import SQL INSERT statements
- **JSON Support**: Import JSON arrays
- **Automatic Parsing**: Extracts table name, columns, and data
- **Validation**: Checks data format and structure

### Query Mock Data

- **Basic SQL**: SELECT, WHERE, LIMIT queries
- **Column Filtering**: SELECT specific columns
- **Row Filtering**: WHERE conditions (=, !=, >, <, >=, <=)
- **Result Limiting**: LIMIT clause support

### Mock Mode Toggle

- **Per Datasource**: Enable/disable mock mode for each datasource
- **Seamless Switch**: Toggle between mock and live data
- **No Code Changes**: Use same dashboard configuration

## API Endpoints

### 1. Upload Mock Data

```http
POST /api/tenants/:tenantId/mockdata
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Sample Inventory",
  "description": "Mock inventory dataset",
  "fileType": "sql",
  "content": "INSERT INTO products ..."
}
```

**Response:**

```json
{
  "id": "mock_abc123",
  "name": "Sample Inventory",
  "tableName": "products",
  "rowCount": 50,
  "columns": ["id", "name", "category", "price"],
  "fileType": "sql",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### 2. List Mock Datasets

```http
GET /api/tenants/:tenantId/mockdata
Authorization: Bearer <token>
```

**Response:**

```json
[
  {
    "id": "mock_abc123",
    "name": "Sample Inventory",
    "tableName": "products",
    "rowCount": 50,
    "columns": ["id", "name", "category", "price"],
    "fileType": "sql",
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

### 3. Query Mock Data

```http
POST /api/tenants/:tenantId/mockdata/:mockDataId/query
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "SELECT * WHERE category = 'Electronics' LIMIT 10"
}
```

**Response:**

```json
{
  "columns": ["id", "name", "category", "price"],
  "rows": [
    { "id": 1, "name": "Laptop", "category": "Electronics", "price": 999.99 }
  ],
  "totalRows": 1
}
```

### 4. Delete Mock Dataset

```http
DELETE /api/tenants/:tenantId/mockdata/:mockDataId
Authorization: Bearer <token>
```

## File Format Examples

### SQL Format

```sql
-- Table name is extracted from INSERT statement
INSERT INTO products (id, name, category, price) VALUES
(1, 'Laptop', 'Electronics', 999.99),
(2, 'Mouse', 'Accessories', 29.99),
(3, 'Keyboard', 'Accessories', 79.99);
```

### JSON Format

```json
[
  {
    "id": 1,
    "customer_name": "Acme Corp",
    "email": "contact@acme.com",
    "revenue": 50000000,
    "status": "active"
  },
  {
    "id": 2,
    "customer_name": "Tech Solutions",
    "email": "info@techsol.com",
    "revenue": 15000000,
    "status": "active"
  }
]
```

## Usage Guide

### Step 1: Upload Mock Data

1. Navigate to `/tenants/:tenantId/mockdata`
2. Click "Upload Mock Data"
3. Enter dataset name and description
4. Select SQL or JSON file
5. Click "Upload"

### Step 2: Enable Mock Mode (Future Feature)

1. Go to datasource settings
2. Toggle "Mock Mode" ON
3. Select mock dataset from dropdown
4. Save datasource

### Step 3: Use in Dashboard

- Dashboards automatically use mock data when mock mode is enabled
- Switch back to live data by disabling mock mode
- No dashboard configuration changes needed

## Query Syntax

The mock data query executor supports basic SQL syntax:

### SELECT Clause

```sql
-- All columns
SELECT *

-- Specific columns
SELECT name, price, category
```

### WHERE Clause

```sql
-- Equality
WHERE category = 'Electronics'

-- Inequality
WHERE price != 0

-- Comparison
WHERE price > 100
WHERE quantity >= 50
WHERE price < 1000

-- Multiple conditions (AND only)
WHERE category = 'Electronics' AND price > 500
```

### LIMIT Clause

```sql
-- Limit results
LIMIT 10

-- With WHERE
WHERE status = 'active' LIMIT 5
```

## Limitations

### Current Limitations

- Basic SQL parser (no JOIN, GROUP BY, ORDER BY yet)
- AND operator only (no OR)
- No nested queries
- No aggregate functions (COUNT, SUM, AVG)
- No date/time functions

### Performance

- Suitable for datasets up to 10,000 rows
- Large datasets may have slower query performance
- Consider using live database for production data

## Testing

Use the provided test script to validate the feature:

```bash
cd scripts
./test-mock-data.sh
```

Update the script with your:

- `TENANT_ID`: Your tenant ID from Firestore
- `AUTH_TOKEN`: Firebase authentication token

## Sample Data Files

Two sample files are provided in the `scripts/` directory:

### 1. sample-inventory-data.sql

- 50 products
- Electronics, Furniture, Accessories, Appliances, Supplies
- Includes: SKU, quantity, price, cost, supplier, location, status

### 2. sample-customers-data.json

- 15 customer companies
- Various industries and countries
- Includes: contact info, revenue, plan, status

## Future Enhancements

- [ ] Advanced SQL support (JOIN, GROUP BY, ORDER BY)
- [ ] CSV file import
- [ ] Excel file import
- [ ] Mock data versioning
- [ ] Data generation from schema
- [ ] Mock data templates library
- [ ] Query performance optimization
- [ ] Data validation rules
- [ ] Mock data sharing across tenants

## Troubleshooting

### Upload fails with "Invalid SQL format"

- Check that SQL contains valid INSERT statements
- Ensure table name is specified: `INSERT INTO table_name`
- Verify column names match data values

### Upload fails with "Invalid JSON format"

- Validate JSON syntax (use jsonlint.com)
- Ensure top-level is an array: `[{...}, {...}]`
- Check for trailing commas

### Query returns no results

- Verify column names match actual columns
- Check WHERE clause syntax
- Use string values in single quotes: `'Electronics'`
- Check for case sensitivity in string comparisons

### "Mock dataset not found"

- Verify mockDataId is correct
- Check user has access to tenant
- Ensure dataset wasn't deleted

## Security Notes

- Mock data is stored per tenant in Firestore
- Access controlled by tenant ownership and SuperAdmin
- Passwords/secrets should not be in mock data
- Mock data is not encrypted at rest
- Consider data privacy when using real-looking data

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review API error messages
3. Check browser console for frontend errors
4. Review backend logs for detailed errors

---

**Created:** January 2024  
**Last Updated:** January 2024  
**Version:** 1.0.0
