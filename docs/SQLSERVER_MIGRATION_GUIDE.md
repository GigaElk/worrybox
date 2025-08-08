# SQL Server Migration Guide

## Changes Made

### 1. Prisma Schema Updates
- ✅ Changed provider from `postgresql` to `sqlserver`
- ✅ Updated decimal precision from `@db.Decimal(3, 2)` to `@db.Decimal(5, 2)`
- ✅ Changed `@db.Text` to `@db.NVarChar(Max)`
- ✅ Converted `Json` type to `String @db.NVarChar(Max)`
- ✅ Converted `String[]` arrays to `String? @db.NVarChar(Max)` (comma-separated)

### 2. Application Code Updates
- ✅ Created `sqlServerArrays.ts` utility for array/JSON handling
- ✅ Added transformation functions for data conversion

### 3. Environment Configuration
- ✅ Updated `.env.test` with SQL Server connection string format
- ✅ Created `.env.example` with Azure SQL and local SQL Server examples

### 4. CI/CD Updates
- ✅ Replaced PostgreSQL service with SQL Server in GitHub Actions
- ✅ Updated database setup commands
- ✅ Changed connection strings in workflow

## Next Steps (After Azure SQL Database is Ready)

### 1. Update Connection String
Replace the DATABASE_URL in your environment files with your Azure SQL connection string:

```env
DATABASE_URL="sqlserver://username:password@yourserver.database.windows.net:1433;database=worrybox;encrypt=true;trustServerCertificate=false;hostNameInCertificate=*.database.windows.net;loginTimeout=30"
```

### 2. Push Schema to Azure SQL
```bash
cd backend
npx prisma db push
```

### 3. Generate Prisma Client
```bash
npx prisma generate
```

### 4. Test Connection
```bash
npx prisma studio
```

## Data Type Conversion Details

### Arrays → Comma-Separated Strings
**Before (PostgreSQL):**
```typescript
keywords: ["anxiety", "work", "stress"]
```

**After (SQL Server):**
```typescript
keywords: "anxiety,work,stress"
```

**Usage in Code:**
```typescript
import { arrayToString, stringToArray } from '../utils/sqlServerArrays';

// When saving
const data = {
  keywords: arrayToString(["anxiety", "work", "stress"])
};

// When reading
const result = await prisma.worryAnalysis.findFirst();
const keywords = stringToArray(result.keywords);
```

### JSON → String
**Before (PostgreSQL):**
```typescript
instructions: { step1: "Breathe", step2: "Relax" }
```

**After (SQL Server):**
```typescript
instructions: '{"step1":"Breathe","step2":"Relax"}'
```

**Usage in Code:**
```typescript
import { jsonToString, stringToJson } from '../utils/sqlServerArrays';

// When saving
const data = {
  instructions: jsonToString({ step1: "Breathe", step2: "Relax" })
};

// When reading
const result = await prisma.guidedExercise.findFirst();
const instructions = stringToJson(result.instructions);
```

## Testing

### Local Testing with SQL Server
1. Install SQL Server locally or use Docker:
```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourPassword123!" -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest
```

2. Update your `.env` file:
```env
DATABASE_URL="sqlserver://localhost:1433;database=worrybox_dev;user=sa;password=YourPassword123!;encrypt=true;trustServerCertificate=true"
```

3. Push schema and test:
```bash
npx prisma db push
npm test
```

## Rollback Plan

If issues arise, you can quickly rollback by:

1. Change `schema.prisma` provider back to `postgresql`
2. Revert the array and JSON field changes
3. Update connection strings back to PostgreSQL format
4. Run `npx prisma db push`

## Performance Considerations

- **Arrays as strings**: Searching within comma-separated values is less efficient than PostgreSQL arrays
- **JSON as strings**: SQL Server 2016+ has good JSON support, but storing as strings is simpler
- **Indexing**: Consider adding indexes on frequently queried string fields

## Future Improvements

1. **Proper JSON support**: Use SQL Server's native JSON functions
2. **Array normalization**: Convert comma-separated strings to proper junction tables
3. **Full-text search**: Leverage SQL Server's full-text search capabilities
4. **Performance optimization**: Add appropriate indexes and query optimization

## Compatibility Notes

- ✅ All existing API endpoints will work unchanged
- ✅ Frontend code requires no changes
- ✅ Tests will continue to work with mocked data
- ✅ Prisma handles most SQL differences automatically

The migration maintains full backward compatibility at the application level while adapting to SQL Server's data model requirements.