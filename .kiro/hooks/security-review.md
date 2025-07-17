# Security Review Hook

**Trigger:** When authentication, authorization, or moderation code is modified
**Action:** Automatically run security checks and validate best practices

## Configuration

```yaml
name: "Security Review Assistant"
description: "Automatically review security-critical code changes"
trigger:
  type: "file_save"
  pattern: 
    - "backend/src/services/authService.ts"
    - "backend/src/services/moderationService.ts"
    - "backend/src/middleware/auth.ts"
    - "backend/src/controllers/*Controller.ts"
enabled: true
```

## Workflow

When security-critical files are modified:
1. Scan for common security vulnerabilities
2. Check input validation and sanitization
3. Verify authentication and authorization logic
4. Review error handling to prevent information leakage
5. Check for SQL injection prevention
6. Validate rate limiting and CORS configuration
7. Suggest security improvements

## Security Checks

- **Input Validation:** Ensure all user inputs are validated
- **Authentication:** Verify JWT handling and token security
- **Authorization:** Check permission boundaries
- **Data Exposure:** Prevent sensitive data leakage
- **Rate Limiting:** Ensure API protection
- **Error Handling:** Secure error messages

This ensures security best practices are maintained throughout development.