# Recurring Upkeep Scheduler

A comprehensive Obsidian plugin for managing recurring tasks and maintenance schedules with visual status indicators, intelligent due date calculations, and multi-language support.

## Features

### Smart Task Status System
- **Never Completed**: Tasks that have never been done (red, high priority)
- **Overdue**: Tasks past their due date (red, urgent)
- **Due Today**: Tasks due on the current day (orange, immediate attention)
- **Due Soon**: Tasks due within the early completion window (orange, can be completed early)
- **Up to Date**: Tasks that don't need attention yet (green, good status)

### Visual Status Indicators
- **Color-coded Status Text**: Semantic colors that convey urgency at a glance
- **Progress Bars**: Visual representation of time elapsed since last completion
- **Completion Buttons**: Smart buttons that appear when tasks can be completed
- **Consistent Theming**: All colors use semantic CSS classes for easy customization

### Intelligent Due Date Logic
- **Early Completion**: Configure how many days before the due date tasks become completable
- **Flexible Intervals**: Support for days, weeks, months, and years
- **Timezone Awareness**: Proper handling of dates across different time zones
- **Completion History**: Automatic tracking of when tasks were completed

### Multi-Language Support
- **German (Deutsch)**: Complete localization including status text and UI
- **English**: Full support with proper pluralization
- **Extensible**: Easy to add new languages via the i18n system

### Interactive Widgets
- **Table View**: Overview of all recurring tasks with filtering and sorting
- **Status Widget**: Individual task status for embedding in notes
- **Real-time Updates**: Automatic refresh when tasks are completed
- **Filter Support**: Query tasks by status, due date, or custom criteria

## Quick Start

### 1. Configure a Recurring Task

Add this frontmatter to any note to make it a recurring task:

```yaml
---
tags:
  - recurring-task
last_done: 2024-01-15
interval: 1
interval_unit: months
complete_early_days: 7
---
```

**Field Explanations:**
- `tags`: Must include `recurring-task` to be detected by the plugin
- `last_done`: The date when this task was last completed (YYYY-MM-DD format)
- `interval`: How often the task should be done (number)
- `interval_unit`: The unit for the interval (`days`, `weeks`, `months`, `years`)
- `complete_early_days`: (Optional) How many days before due date the task becomes available for completion (default: 7)

### 2. Display Tasks

#### Table View (All Tasks)
```markdown
```recurring-upkeep-table
```

#### Table View with Filtering
```markdown
```recurring-upkeep-table
status:overdue OR status:due-today
```

#### Individual Status Widget
```markdown
```recurring-upkeep-status
```

## Task Status Logic

The plugin uses intelligent logic to determine task status based on business rules:

### Status Determination Rules

1. **Never Completed** (Red): Tasks with no `last_done` date
2. **Completed Today** (Green): Tasks completed on the current date
3. **Overdue** (Red): Tasks past their calculated due date
4. **Due Today** (Orange): Tasks due on the current date
5. **Due Soon** (Orange): Tasks within the early completion window OR within 7 days
6. **Up to Date** (Green): Tasks that don't require attention yet

### Early Completion Logic

Tasks become eligible for completion when:
- They have never been completed, OR
- They are within the `complete_early_days` window of their due date

The early completion window prevents tasks from being marked complete immediately after completion, while allowing flexibility for scheduling.

## Centralized Styling System

The plugin uses a unified styling system that ensures consistency across all components:

### Semantic CSS Classes

All visual styling is controlled by semantic CSS classes:

```css
/* Status text colors */
.recurring-upkeep-never-completed
.recurring-upkeep-overdue
.recurring-upkeep-due-today
.recurring-upkeep-due-soon
.recurring-upkeep-up-to-date

/* Progress bar colors */
.recurring-upkeep-progress-never-completed
.recurring-upkeep-progress-overdue
.recurring-upkeep-progress-due-today
.recurring-upkeep-progress-due-soon
.recurring-upkeep-progress-up-to-date

/* Button states */
.recurring-upkeep-button-urgent
.recurring-upkeep-button-ready
.recurring-upkeep-button-success
.recurring-upkeep-button-error
```

### Theme Customization

You can customize colors by overriding CSS custom properties:

```css
:root {
  --task-never-completed-color: #your-color;
  --task-overdue-color: #your-color;
  --task-due-today-color: #your-color;
  --task-due-soon-color: #your-color;
  --task-up-to-date-color: #your-color;
}
```

## Advanced Configuration

### Complete Early Days per Task

Each task can have its own early completion window:

```yaml
---
tags:
  - recurring-task
last_done: 2024-01-15
interval: 2
interval_unit: weeks
complete_early_days: 3  # Can complete 3 days early
---
```

### Filter Queries

The table view supports advanced filtering:

```markdown
```recurring-upkeep-table
status:overdue OR (status:due-soon AND days:<=3)
```

Available filters:
- `status:` - never-completed, overdue, due-today, due-soon, up-to-date
- `days:` - days until due (supports `<=`, `>=`, `<`, `>`, `=`)
- `tag:` - filter by file tags

## Technical Architecture

### Core Components

- **TaskStyling**: Centralized logic for all visual styling decisions
- **TaskProcessor**: Handles task status calculation and data processing
- **StatusIndicator**: Renders status text with proper localization
- **ProgressBar**: Visual progress indicators with semantic colors
- **CompleteButton**: Smart completion buttons with status-aware styling
- **I18nUtils**: Comprehensive internationalization system

### Design Principles

1. **Single Source of Truth**: All color and styling logic is centralized in `TaskStyling`
2. **Semantic Classes**: CSS classes describe meaning, not appearance
3. **Progressive Enhancement**: Works without JavaScript, enhanced with interactivity
4. **Accessibility First**: Proper contrast, keyboard navigation, screen reader support
5. **Theme Aware**: Adapts to Obsidian's light/dark themes automatically

## Installation

1. Download the plugin files
2. Place them in your `.obsidian/plugins/recurring-upkeep-scheduler/` directory
3. Enable the plugin in Obsidian's settings
4. Ensure the Dataview plugin is installed and enabled (required dependency)

## Requirements

- **Obsidian**: Version 0.15.0 or higher
- **Dataview Plugin**: Required for task detection and querying
- **Modern Browser**: Supports CSS custom properties and ES6+ features

## Contributing

### Adding New Languages

1. Create a new locale file in `i18n/locales/` (e.g., `fr.ts`)
2. Follow the structure of existing locale files
3. Add the locale to the `I18nManager.ts` available locales list
4. Test all UI elements and status text

### Extending Styling

1. Add new semantic CSS classes following the naming convention
2. Use CSS custom properties for theme customization
3. Ensure all colors work in both light and dark themes
4. Test with high contrast mode and reduced motion preferences

## License

MIT License - see LICENSE file for details.

## Changelog

### v1.0.4 - Centralized Styling & Bug Fixes
- **BREAKING**: Refactored all color logic to use centralized `TaskStyling` class
- **FIXED**: Progress bar colors now correctly match status text colors
- **IMPROVED**: All inline styles moved to semantic CSS classes
- **ENHANCED**: Better theme customization support with CSS custom properties
- **ADDED**: Comprehensive accessibility improvements (high contrast, reduced motion)
- **OPTIMIZED**: Performance improvements through centralized logic

### Previous Versions
- v1.0.3: Added multi-language support and improved date handling
- v1.0.2: Enhanced filter system and table view improvements
- v1.0.1: Initial progress bar and completion tracking
- v1.0.0: Basic recurring task functionality

---

For more detailed documentation and examples, see the plugin's GitHub repository.
