# PostgreSQL to SQL Server Migration Changes

## Data Type Changes Needed

### 1. String Arrays → Separate Tables
PostgreSQL arrays need to be converted to separate tables in SQL Server:

**Current (PostgreSQL):**
```prisma
keywords          String[]
copingMethods     String[]
flaggedReasons    String[]
whenToUse         String[]
tags              String[]
```

**New (SQL Server):**
- Create separate junction tables for each array relationship

### 2. Json Type → String with JSON validation
**Current:**
```prisma
data      Json
instructions    Json
metadata     Json      @default("{}")
```

**New:**
```prisma
data      String  // Store as JSON string
instructions    String  // Store as JSON string  
metadata     String  @default("{}") // Store as JSON string
```

### 3. Decimal Precision
**Current:**
```prisma
moderationScore   Decimal?  @db.Decimal(3, 2)
sentimentScore    Decimal?  @db.Decimal(3, 2)
```

**New:**
```prisma
moderationScore   Decimal?  @db.Decimal(5, 2)  // SQL Server format
sentimentScore    Decimal?  @db.Decimal(5, 2)  // SQL Server format
```

### 4. Text Fields
**Current:**
```prisma
content     String   @db.Text
instructions      String     @db.Text
```

**New:**
```prisma
content     String   @db.NVarChar(Max)
instructions      String     @db.NVarChar(Max)
```

## Migration Strategy

1. **Phase 1**: Update basic data types (provider, decimals, text)
2. **Phase 2**: Convert arrays to separate tables
3. **Phase 3**: Update JSON handling in application code
4. **Phase 4**: Test and validate

## Impact Assessment

- **Low Impact**: Provider change, decimal precision, text fields
- **Medium Impact**: JSON type changes (mostly transparent)
- **High Impact**: Array to table conversion (requires schema redesign)

## Recommendation

Start with Phase 1 changes to get basic connectivity working, then tackle arrays in Phase 2.