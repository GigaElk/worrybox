# Database Migration Hook

**Trigger:** When Prisma schema file is modified
**Action:** Automatically generate and review database migrations

## Configuration

```yaml
name: "Database Migration Assistant"
description: "Automatically handle Prisma schema changes and migrations"
trigger:
  type: "file_save"
  pattern: "backend/prisma/schema.prisma"
enabled: true
```

## Workflow

When `schema.prisma` is modified:
1. Analyze the schema changes
2. Generate a descriptive migration name
3. Run `prisma migrate dev` with the generated name
4. Update Prisma client
5. Check for any breaking changes
6. Suggest data migration scripts if needed

## Example Usage

- Add new model → Generate migration "add-user-preferences-model"
- Modify field → Generate migration "update-post-privacy-field"
- Add relation → Generate migration "add-comment-moderation-relation"

This ensures database schema stays in sync and migrations are properly tracked.