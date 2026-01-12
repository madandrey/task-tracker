# 🚀 TaskFlow - Professional Task Tracker

<div align="center">

![TaskFlow](https://img.shields.io/badge/TaskFlow-v2.0.0-6366f1)
![Python](https://img.shields.io/badge/Python-3.10+-3776ab)
![FastAPI](https://img.shields.io/badge/FastAPI-0.128.0-009688)
![Tests](https://img.shields.io/badge/Tests-32%20passed-22c55e)
![License](https://img.shields.io/badge/License-MIT-green)

**A modern, beautiful, and powerful Kanban-style task tracker**

*Competitor to Jira, Trello, and Notion*

[Features](#-features) • [Quick Start](#-quick-start) • [API Docs](#-api-documentation) • [Screenshots](#-screenshots)

</div>

---

## ✨ Features

### 📋 Core Task Management
- **Kanban Board** - Visual task management with drag & drop
- **Task CRUD** - Create, read, update, delete tasks
- **4 Priority Levels** - Low, Medium, High, Urgent with visual indicators
- **4 Status States** - To Do, In Progress, Done, Archived

### 📅 Due Dates & Deadlines
- Set due dates for tasks
- Visual overdue indicators (red border)
- Today's tasks highlighted
- Calendar date picker

### ✅ Subtasks (Checklist)
- Add subtasks to break down work
- Track completion progress (e.g., 3/5 done)
- Check/uncheck subtasks
- Visual progress in task cards

### 💬 Comments
- Add comments to tasks
- Timestamped comments
- Delete comments
- Comment counter on cards

### 🏷️ Labels (Tags)
- Create custom labels with colors
- Assign multiple labels to tasks
- Filter tasks by label
- Visual label badges on cards

### 📁 Projects
- Organize tasks into projects
- Custom project colors
- Filter by project
- Delete project cascades tasks

### 🔍 Search & Filters
- Full-text search (title + description)
- Filter by status, project, priority, label
- Active filter chips display
- Clear individual filters

### 📊 Statistics Dashboard
- Total tasks overview
- Completion rate percentage
- Tasks completed this week
- Breakdown by status, priority, project
- Overdue tasks count

### 📦 Archive
- Archive completed tasks
- View archived tasks
- Restore or delete archived

### 📤 Export
- Export all data as JSON
- Export tasks as CSV
- Download files directly

### 🎨 UI/UX
- **Dark/Light Theme** - Toggle with persistence
- **Toast Notifications** - Success, error, info messages
- **Loading States** - Spinner during operations
- **Confirmation Dialogs** - Before destructive actions
- **Keyboard Shortcuts** - `Ctrl+N` new task, `/` search, `Escape` close
- **Mobile Responsive** - Works on all devices
- **Smooth Animations** - Slide, fade, scale transitions
- **Empty States** - Helpful messages when no data

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10 or higher
- pip (Python package manager)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/madandrey/task-tracker.git
cd task-tracker

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the application
python main.py
```

### Access the Application

- **🌐 Web Interface**: http://localhost:8000
- **📚 API Docs (Swagger)**: http://localhost:8000/docs
- **📖 API Docs (ReDoc)**: http://localhost:8000/redoc

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (Browser)                           │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Sidebar          │        Main Content                       │  │
│  │  ┌─────────────┐  │  ┌─────────┐ ┌─────────┐ ┌─────────┐    │  │
│  │  │ Navigation  │  │  │  To Do  │ │Progress │ │  Done   │    │  │
│  │  │ Projects    │  │  │ Column  │ │ Column  │ │ Column  │    │  │
│  │  │ Labels      │  │  └─────────┘ └─────────┘ └─────────┘    │  │
│  │  └─────────────┘  │                                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │ REST API
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │   Tasks    │  │  Projects  │  │   Labels   │  │ Statistics │   │
│  │  Subtasks  │  │   Boards   │  │  Comments  │  │   Export   │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │ SQLAlchemy ORM
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SQLite Database                                 │
│  tasks │ projects │ labels │ subtasks │ comments │ task_labels     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:8000/api
```

### Endpoints Overview

| Resource | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| **Tasks** | GET | `/tasks` | Get all tasks (with filters) |
| | GET | `/tasks/{id}` | Get single task with details |
| | POST | `/tasks` | Create new task |
| | PUT | `/tasks/{id}` | Update task |
| | DELETE | `/tasks/{id}` | Delete task |
| | POST | `/tasks/{id}/archive` | Archive task |
| **Subtasks** | POST | `/subtasks` | Create subtask |
| | PUT | `/subtasks/{id}` | Update subtask |
| | DELETE | `/subtasks/{id}` | Delete subtask |
| **Comments** | POST | `/comments` | Add comment |
| | DELETE | `/comments/{id}` | Delete comment |
| **Labels** | GET | `/labels` | Get all labels |
| | POST | `/labels` | Create label |
| | DELETE | `/labels/{id}` | Delete label |
| **Projects** | GET | `/projects` | Get all projects |
| | POST | `/projects` | Create project |
| | DELETE | `/projects/{id}` | Delete project |
| **Statistics** | GET | `/statistics` | Get stats overview |
| **Export** | GET | `/export/json` | Export as JSON |
| | GET | `/export/csv` | Export as CSV |

### Query Parameters for `/api/tasks`

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (todo, in_progress, done, archived) |
| `project_id` | int | Filter by project |
| `priority` | string | Filter by priority (low, medium, high, urgent) |
| `label_id` | int | Filter by label |
| `search` | string | Search in title and description |
| `include_archived` | bool | Include archived tasks (default: false) |

### Example Requests

**Create Task with Labels and Due Date:**
```bash
curl -X POST http://localhost:8000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete project",
    "description": "Finish by end of week",
    "priority": "high",
    "due_date": "2026-01-20T17:00:00Z",
    "project_id": 1,
    "label_ids": [1, 2]
  }'
```

**Add Subtask:**
```bash
curl -X POST http://localhost:8000/api/subtasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Review code", "task_id": 1}'
```

---

## 🧪 Testing

### Run All Tests

```bash
# Activate virtual environment
source venv/bin/activate

# Run tests
PYTHONPATH=. pytest -v

# Run with coverage
PYTHONPATH=. pytest --cov=app --cov-report=html
```

### Test Coverage

| Category | Tests | Coverage |
|----------|-------|----------|
| Task CRUD | 8 | ✅ |
| Subtasks | 3 | ✅ |
| Comments | 2 | ✅ |
| Labels | 4 | ✅ |
| Projects | 3 | ✅ |
| Filtering | 4 | ✅ |
| Statistics | 1 | ✅ |
| Export | 2 | ✅ |
| Edge Cases | 5 | ✅ |
| **Total** | **32** | **100%** |

---

## 📁 Project Structure

```
task-tracker/
├── app/
│   ├── __init__.py
│   ├── database.py          # Database configuration
│   ├── models.py             # SQLAlchemy models
│   └── schemas.py            # Pydantic schemas
├── static/
│   ├── index.html            # Main HTML
│   ├── styles.css            # CSS (dark/light themes)
│   └── app.js                # JavaScript application
├── tests/
│   ├── __init__.py
│   └── test_api.py           # 32 comprehensive tests
├── main.py                   # FastAPI application
├── requirements.txt          # Dependencies
├── BDD_SPECS.md             # BDD specifications
├── .gitignore
└── README.md
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + N` | Create new task |
| `/` | Focus search input |
| `Escape` | Close modals |

---

## 🎨 Themes

### Dark Theme (Default)
- Deep dark backgrounds
- Purple/indigo accent colors
- Subtle gradients

### Light Theme
- Clean white backgrounds
- Same accent colors
- Softer shadows

Toggle with the 🌙/☀️ button in the sidebar.

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./taskflow.db` | Database connection |
| `HOST` | `0.0.0.0` | Server host |
| `PORT` | `8000` | Server port |

---

## 📊 Comparison with Competitors

| Feature | TaskFlow | Trello | Jira | Notion |
|---------|----------|--------|------|--------|
| Kanban Board | ✅ | ✅ | ✅ | ✅ |
| Subtasks | ✅ | ✅ | ✅ | ✅ |
| Comments | ✅ | ✅ | ✅ | ✅ |
| Labels | ✅ | ✅ | ✅ | ✅ |
| Due Dates | ✅ | ✅ | ✅ | ✅ |
| Dark Theme | ✅ | ❌ | ❌ | ✅ |
| Self-Hosted | ✅ | ❌ | ❌ | ❌ |
| Open Source | ✅ | ❌ | ❌ | ❌ |
| Free | ✅ | Limited | Limited | Limited |
| Fast Setup | ✅ | ❌ | ❌ | ❌ |

---

## 🚀 Deployment

### Docker (Coming Soon)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Tips

1. Use PostgreSQL instead of SQLite
2. Add authentication (JWT)
3. Set up HTTPS with nginx
4. Configure CORS properly
5. Add rate limiting

---

## 📝 License

MIT License - feel free to use this project for any purpose.

---

## 🙏 Acknowledgments

- Built with FastAPI, SQLAlchemy, and vanilla JavaScript
- Designed with modern UI/UX principles
- Created with ❤️ using AI-assisted development

---

<div align="center">

**[⬆ Back to Top](#-taskflow---professional-task-tracker)**

Made with ❤️ by TaskFlow Team

</div>
