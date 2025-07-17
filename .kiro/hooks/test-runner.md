# Test Runner Hook

**Trigger:** When TypeScript service files are saved in the backend
**Action:** Automatically run relevant tests and provide feedback

## Configuration

```yaml
name: "Auto Test Runner"
description: "Automatically run tests when service files are modified"
trigger:
  type: "file_save"
  pattern: "backend/src/services/*.ts"
enabled: true
```

## Workflow

When a service file is saved:
1. Identify the corresponding test file
2. Run the specific test suite
3. Report results and any failures
4. Suggest fixes if tests fail

## Example Usage

- Save `moderationService.ts` → Run `moderationService.test.ts`
- Save `postService.ts` → Run `postService.test.ts`
- Save `userService.ts` → Run `userService.test.ts`

This ensures immediate feedback on code changes and maintains test coverage.