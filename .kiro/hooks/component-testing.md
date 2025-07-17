# Component Testing Hook

**Trigger:** When React components are created or modified
**Action:** Automatically generate or update component tests

## Configuration

```yaml
name: "Component Test Generator"
description: "Automatically create and maintain React component tests"
trigger:
  type: "file_save"
  pattern: "frontend/src/components/*.tsx"
enabled: true
```

## Workflow

When a React component is saved:
1. Analyze component props, state, and functionality
2. Generate or update corresponding test file
3. Create tests for key user interactions
4. Test component rendering with different props
5. Verify accessibility compliance
6. Check for proper error handling
7. Ensure responsive design testing

## Test Generation

- **Rendering Tests:** Component renders without crashing
- **Props Testing:** Component handles different prop combinations
- **Interaction Tests:** User interactions work correctly
- **Accessibility Tests:** Screen reader and keyboard navigation
- **Error Boundary Tests:** Component handles errors gracefully

## Example Usage

- Save `ModerationQueue.tsx` → Generate `ModerationQueue.test.tsx`
- Modify `PostCard.tsx` → Update existing tests with new functionality
- Add new props → Generate tests for new prop combinations

This ensures comprehensive test coverage for all UI components.