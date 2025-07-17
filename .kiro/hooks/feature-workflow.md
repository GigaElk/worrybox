# Feature Development Workflow Hook

**Trigger:** When new feature branches are created or spec files are updated
**Action:** Automatically guide through the complete feature development lifecycle

## Configuration

```yaml
name: "Feature Development Assistant"
description: "Automate the complete feature development workflow"
trigger:
  type: "multiple"
  patterns:
    - ".kiro/specs/*/tasks.md"
    - "git_branch_create:feature/*"
enabled: true
```

## Workflow

When a new feature is started:

### 1. **Spec Analysis**
- Parse the feature specification and requirements
- Identify required backend services, controllers, and routes
- Determine frontend components and services needed
- Check for database schema changes required

### 2. **Scaffolding Generation**
- Generate boilerplate service files with proper interfaces
- Create controller templates with validation rules
- Generate React component skeletons with TypeScript props
- Set up test file templates for all new code

### 3. **Development Guidance**
- Suggest implementation order based on dependencies
- Provide code snippets for common patterns
- Recommend testing strategies for the feature
- Identify potential security considerations

### 4. **Quality Assurance**
- Run tests automatically as code is developed
- Check API endpoint consistency
- Validate database migrations
- Ensure proper error handling

### 5. **Integration Verification**
- Test frontend-backend integration
- Verify authentication and authorization
- Check moderation system integration
- Validate scheduling system compatibility

## Example: New Feature "User Notifications"

When creating a notification feature:

1. **Auto-generates:**
   - `NotificationService.ts` with CRUD operations
   - `NotificationController.ts` with validation
   - `NotificationQueue.tsx` React component
   - Test files for all components

2. **Suggests:**
   - Database schema additions
   - API endpoint structure
   - Real-time update strategy
   - Integration points with existing features

3. **Validates:**
   - Security permissions
   - Performance implications
   - User experience consistency
   - Accessibility compliance

This hook transforms feature development from manual, error-prone work into a guided, automated process that ensures consistency and quality across the entire WorryBox platform.