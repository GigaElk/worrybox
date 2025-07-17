# Code Quality Hook

**Trigger:** When TypeScript files are saved
**Action:** Automatically run linting, formatting, and type checking

## Configuration

```yaml
name: "Code Quality Enforcer"
description: "Automatically maintain code quality standards"
trigger:
  type: "file_save"
  pattern: 
    - "**/*.ts"
    - "**/*.tsx"
enabled: true
```

## Workflow

When TypeScript files are saved:
1. Run ESLint to check for code quality issues
2. Apply Prettier formatting automatically
3. Perform TypeScript type checking
4. Check for unused imports and variables
5. Verify naming conventions
6. Suggest performance optimizations
7. Check for accessibility issues in React components

## Quality Checks

- **Linting:** ESLint rules for code consistency
- **Formatting:** Prettier for consistent code style
- **Type Safety:** TypeScript compiler checks
- **Performance:** Identify potential performance issues
- **Accessibility:** React accessibility best practices
- **Imports:** Clean up unused imports
- **Naming:** Consistent naming conventions

## Auto-fixes Applied

- Remove unused imports
- Fix formatting issues
- Apply consistent indentation
- Sort imports alphabetically
- Fix simple ESLint violations

This ensures consistent, high-quality code across the entire project.