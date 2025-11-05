# Database Connection Setup

## Prerequisites

To enable real database connection testing, you need to install the required database drivers:

```bash
cd backend

# Install all database drivers
npm install mssql mysql2 pg mongodb

# Install type definitions
npm install --save-dev @types/mssql @types/pg
```

## Supported Databases

### 1. **SQL Server (MSSQL)**

```bash
npm install mssql
npm install --save-dev @types/mssql
```

**Connection String Format:**

```
sqlserver://localhost:1433;database=mydb;user=sa;password=YourPassword;encrypt=true;trustServerCertificate=true
```

**Configuration:**

- Host: SQL Server instance hostname/IP
- Port: 1433 (default)
- Database: Database name
- Username: SQL Server username
- Password: SQL Server password
- Schema: Optional (e.g., dbo, sales, etc.)

**Features:**

- ✅ Real connection testing
- ✅ Automatic table discovery
- ✅ Schema support
- ✅ Detailed error logging

---

### 2. **MySQL**

```bash
npm install mysql2
```

**Connection String Format:**

```
mysql://username:password@localhost:3306/database_name
```

**Configuration:**

- Host: MySQL server hostname/IP
- Port: 3306 (default)
- Database: Database name
- Username: MySQL username
- Password: MySQL password

**Features:**

- ✅ Real connection testing
- ✅ Automatic table discovery
- ✅ Detailed error logging

---

### 3. **PostgreSQL**

```bash
npm install pg
npm install --save-dev @types/pg
```

**Connection String Format:**

```
postgresql://username:password@localhost:5432/database_name
```

**Configuration:**

- Host: PostgreSQL server hostname/IP
- Port: 5432 (default)
- Database: Database name
- Username: PostgreSQL username
- Password: PostgreSQL password

**Features:**

- ✅ Real connection testing
- ✅ Automatic table discovery
- ✅ Detailed error logging

---

### 4. **MongoDB**

```bash
npm install mongodb
```

**Connection String Format:**

```
mongodb://username:password@localhost:27017/database_name
```

**Configuration:**

- Host: MongoDB server hostname/IP
- Port: 27017 (default)
- Database: Database name
- Username: MongoDB username (optional)
- Password: MongoDB password (optional)

**Features:**

- ✅ Real connection testing
- ✅ Automatic collection discovery
- ✅ Detailed error logging

---

## Environment Variables

Create a `.env` file in the backend directory:

```env
# Firebase Config
GOOGLE_APPLICATION_CREDENTIALS=./flexboard-v2-firebase-adminsdk-xxxxx.json

# Server Config
PORT=5001
NODE_ENV=development

# Optional: Database connection strings for testing
DATABASE_URL_MSSQL="sqlserver://localhost:1433;database=shareddata;user=sa;password=YourPassword;encrypt=true;trustServerCertificate=true"
DATABASE_URL_MYSQL="mysql://root:password@localhost:3306/mydb"
DATABASE_URL_POSTGRES="postgresql://postgres:password@localhost:5432/mydb"
DATABASE_URL_MONGODB="mongodb://localhost:27017/mydb"
```

---

## Testing Connection

### From Frontend

1. Go to Dashboard → Settings → Data Source Configuration
2. Click "+ New"
3. Fill in connection details
4. Click "Test Connection"
5. See real-time logs in backend terminal

### From Backend Logs

When you test a connection, you'll see detailed logs like:

```
🔵 ===== Testing MSSQL Connection =====
Config: {
  host: 'localhost',
  port: 1433,
  database: 'shareddata',
  username: 'sa',
  password: '***hidden***'
}
🔵 Connecting to MSSQL...
✅ MSSQL Connected! Fetching tables...
✅ MSSQL Test successful! Tables: 5
Test Result: {
  success: true,
  message: 'Connected successfully! Found 5 tables',
  tablesCount: 5
}
```

### Error Examples

**Wrong Password:**

```
❌ MSSQL Connection failed: Login failed for user 'sa'
```

**Wrong Host:**

```
❌ MSSQL Connection failed: Failed to connect to localhost:1433
```

**Wrong Database:**

```
❌ MSSQL Connection failed: Cannot open database "wrongdb"
```

---

## Security Notes

⚠️ **Important Security Considerations:**

1. **Password Storage:**

   - Passwords are stored in Firestore
   - TODO: Implement encryption before storing
   - Consider using Secret Manager or Key Vault in production

2. **Password in Edit Mode:**

   - Password is NOT retrieved when editing
   - Users must re-enter password and test connection
   - This prevents password exposure

3. **Connection Timeout:**

   - All connections timeout after 10 seconds
   - Prevents hanging connections

4. **Logging:**
   - Passwords are hidden in logs (shown as `***hidden***`)
   - Connection details are logged for debugging

---

## Troubleshooting

### Package Not Installed Error

```
Error: Cannot find module 'mssql'
```

**Solution:** Run `npm install mssql` in backend directory

### Type Definition Error

```
Could not find a declaration file for module 'mssql'
```

**Solution:** Run `npm install --save-dev @types/mssql`

### Connection Timeout

```
Connection failed: Connection timeout
```

**Solution:**

- Check if database server is running
- Check firewall settings
- Verify host and port are correct

### Authentication Failed

```
Connection failed: Login failed for user
```

**Solution:**

- Verify username and password
- Check database permissions
- For SQL Server: Ensure SQL Server Authentication is enabled

---

## Future Enhancements

- [ ] Add Oracle database support
- [ ] Add Firestore native support
- [ ] Add BigQuery support
- [ ] Add REST API data source
- [ ] Add Google Sheets data source
- [ ] Implement password encryption
- [ ] Add connection pooling
- [ ] Add query execution
- [ ] Add caching for table lists
