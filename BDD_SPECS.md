# 📋 TaskFlow - BDD Specifications

## Business Requirements

### Feature: Task Management

```gherkin
Feature: Task Management
  As a user
  I want to manage my tasks
  So that I can organize my work efficiently

  Scenario: Create a new task
    Given I am on the task board
    When I enter a task title "Buy groceries"
    And I click the add button
    Then I should see "Buy groceries" in my task list
    And the task should have status "todo"

  Scenario: Complete a task
    Given I have a task "Buy groceries" with status "todo"
    When I mark the task as completed
    Then the task status should be "done"
    And the task should appear in the done column

  Scenario: Delete a task
    Given I have a task "Buy groceries"
    When I delete the task
    Then the task should be removed from the list

  Scenario: Move task between columns
    Given I have a task "Buy groceries" with status "todo"
    When I move the task to "in_progress"
    Then the task status should be "in_progress"
    And the task should appear in the in progress column
```

### Feature: Project Organization

```gherkin
Feature: Project Organization
  As a user
  I want to organize tasks into projects
  So that I can group related work together

  Scenario: Create a project
    Given I am on the task board
    When I create a new project "Work"
    Then I should see "Work" in my project list

  Scenario: Assign task to project
    Given I have a task "Meeting notes"
    And I have a project "Work"
    When I assign the task to project "Work"
    Then the task should be associated with "Work"

  Scenario: Filter tasks by project
    Given I have tasks in different projects
    When I select project "Work" filter
    Then I should only see tasks from "Work" project
```

### Feature: Task Priorities

```gherkin
Feature: Task Priorities
  As a user
  I want to set priorities for tasks
  So that I can focus on important work first

  Scenario: Set task priority
    Given I have a task "Urgent report"
    When I set priority to "high"
    Then the task should display high priority indicator
    And the task should be visually highlighted
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks | Get all tasks |
| POST | /api/tasks | Create a new task |
| PUT | /api/tasks/{id} | Update a task |
| DELETE | /api/tasks/{id} | Delete a task |
| GET | /api/projects | Get all projects |
| POST | /api/projects | Create a new project |
| DELETE | /api/projects/{id} | Delete a project |

## Data Models

### Task
- id: int (auto-generated)
- title: string (required)
- description: string (optional)
- status: enum (todo, in_progress, done)
- priority: enum (low, medium, high)
- project_id: int (optional, foreign key)
- created_at: datetime
- updated_at: datetime

### Project
- id: int (auto-generated)
- name: string (required)
- color: string (hex color)
- created_at: datetime

