# API Documentation Hook

**Trigger:** When controller files are modified
**Action:** Automatically update API documentation and validate endpoints

## Configuration

```yaml
name: "API Documentation Sync"
description: "Keep API documentation in sync with controller changes"
trigger:
  type: "file_save"
  pattern: "backend/src/controllers/*.ts"
enabled: true
```

## Workflow

When a controller file is saved:
1. Parse the controller methods and routes
2. Extract endpoint definitions, parameters, and responses
3. Update or create corresponding API documentation
4. Validate request/response schemas match TypeScript interfaces
5. Check for missing validation or error handling
6. Generate OpenAPI/Swagger documentation

## Example Usage

- Modify `moderationController.ts` → Update moderation API docs
- Add new endpoint in `postController.ts` → Generate endpoint documentation
- Change validation rules → Update parameter documentation

This ensures API documentation is always current and accurate.