"""
TDD Tests for TaskFlow API (Production Version)
Comprehensive test coverage for all features
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime, timedelta, timezone

from app.models import Base
from app.database import get_db
from main import app

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


# ==================== TASK TESTS ====================

class TestTaskCRUD:
    """Test Task Create, Read, Update, Delete operations"""

    def test_create_task(self, client):
        """Create a new task with all fields"""
        response = client.post("/api/tasks", json={
            "title": "Buy groceries",
            "description": "Milk, bread, eggs",
            "priority": "high"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Buy groceries"
        assert data["status"] == "todo"
        assert data["priority"] == "high"
        assert "id" in data

    def test_create_task_with_due_date(self, client):
        """Create task with due date"""
        due_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        response = client.post("/api/tasks", json={
            "title": "Submit report",
            "due_date": due_date
        })
        assert response.status_code == 201
        assert response.json()["due_date"] is not None

    def test_get_all_tasks(self, client):
        """Get all tasks"""
        client.post("/api/tasks", json={"title": "Task 1"})
        client.post("/api/tasks", json={"title": "Task 2"})

        response = client.get("/api/tasks")
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_get_single_task(self, client):
        """Get single task with all details"""
        create_response = client.post("/api/tasks", json={"title": "Test task"})
        task_id = create_response.json()["id"]

        response = client.get(f"/api/tasks/{task_id}")
        assert response.status_code == 200
        assert response.json()["title"] == "Test task"
        assert "subtasks" in response.json()
        assert "comments" in response.json()
        assert "labels" in response.json()

    def test_update_task_status(self, client):
        """Update task status to done"""
        create_response = client.post("/api/tasks", json={"title": "Complete me"})
        task_id = create_response.json()["id"]

        response = client.put(f"/api/tasks/{task_id}", json={"status": "done"})
        assert response.status_code == 200
        assert response.json()["status"] == "done"
        assert response.json()["completed_at"] is not None

    def test_delete_task(self, client):
        """Delete a task"""
        create_response = client.post("/api/tasks", json={"title": "Delete me"})
        task_id = create_response.json()["id"]

        response = client.delete(f"/api/tasks/{task_id}")
        assert response.status_code == 204

        get_response = client.get("/api/tasks")
        assert len(get_response.json()) == 0

    def test_archive_task(self, client):
        """Archive a completed task"""
        create_response = client.post("/api/tasks", json={"title": "Archive me"})
        task_id = create_response.json()["id"]

        response = client.post(f"/api/tasks/{task_id}/archive")
        assert response.status_code == 200
        assert response.json()["status"] == "archived"

    def test_task_priority_urgent(self, client):
        """Test urgent priority level"""
        response = client.post("/api/tasks", json={
            "title": "Urgent task",
            "priority": "urgent"
        })
        assert response.status_code == 201
        assert response.json()["priority"] == "urgent"


# ==================== SUBTASK TESTS ====================

class TestSubtasks:
    """Test Subtask functionality"""

    def test_create_subtask(self, client):
        """Create a subtask for a task"""
        task_response = client.post("/api/tasks", json={"title": "Parent task"})
        task_id = task_response.json()["id"]

        response = client.post("/api/subtasks", json={
            "title": "Subtask 1",
            "task_id": task_id
        })
        assert response.status_code == 201
        assert response.json()["title"] == "Subtask 1"
        assert response.json()["is_completed"] == False

    def test_complete_subtask(self, client):
        """Mark subtask as completed"""
        task_response = client.post("/api/tasks", json={"title": "Parent task"})
        task_id = task_response.json()["id"]
        
        subtask_response = client.post("/api/subtasks", json={
            "title": "Subtask",
            "task_id": task_id
        })
        subtask_id = subtask_response.json()["id"]

        response = client.put(f"/api/subtasks/{subtask_id}", json={"is_completed": True})
        assert response.status_code == 200
        assert response.json()["is_completed"] == True

    def test_delete_subtask(self, client):
        """Delete a subtask"""
        task_response = client.post("/api/tasks", json={"title": "Parent task"})
        task_id = task_response.json()["id"]
        
        subtask_response = client.post("/api/subtasks", json={
            "title": "Subtask",
            "task_id": task_id
        })
        subtask_id = subtask_response.json()["id"]

        response = client.delete(f"/api/subtasks/{subtask_id}")
        assert response.status_code == 204


# ==================== COMMENT TESTS ====================

class TestComments:
    """Test Comment functionality"""

    def test_create_comment(self, client):
        """Add comment to a task"""
        task_response = client.post("/api/tasks", json={"title": "Task"})
        task_id = task_response.json()["id"]

        response = client.post("/api/comments", json={
            "content": "This is a comment",
            "task_id": task_id
        })
        assert response.status_code == 201
        assert response.json()["content"] == "This is a comment"

    def test_delete_comment(self, client):
        """Delete a comment"""
        task_response = client.post("/api/tasks", json={"title": "Task"})
        task_id = task_response.json()["id"]
        
        comment_response = client.post("/api/comments", json={
            "content": "Comment",
            "task_id": task_id
        })
        comment_id = comment_response.json()["id"]

        response = client.delete(f"/api/comments/{comment_id}")
        assert response.status_code == 204


# ==================== LABEL TESTS ====================

class TestLabels:
    """Test Label functionality"""

    def test_create_label(self, client):
        """Create a new label"""
        response = client.post("/api/labels", json={
            "name": "Bug",
            "color": "#ef4444"
        })
        assert response.status_code == 201
        assert response.json()["name"] == "Bug"

    def test_get_all_labels(self, client):
        """Get all labels"""
        client.post("/api/labels", json={"name": "Bug"})
        client.post("/api/labels", json={"name": "Feature"})

        response = client.get("/api/labels")
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_assign_labels_to_task(self, client):
        """Assign labels to a task"""
        label_response = client.post("/api/labels", json={"name": "Important"})
        label_id = label_response.json()["id"]

        task_response = client.post("/api/tasks", json={
            "title": "Labeled task",
            "label_ids": [label_id]
        })
        assert task_response.status_code == 201
        assert len(task_response.json()["labels"]) == 1

    def test_delete_label(self, client):
        """Delete a label"""
        label_response = client.post("/api/labels", json={"name": "Temp"})
        label_id = label_response.json()["id"]

        response = client.delete(f"/api/labels/{label_id}")
        assert response.status_code == 204


# ==================== PROJECT TESTS ====================

class TestProjectCRUD:
    """Test Project management"""

    def test_create_project(self, client):
        """Create a new project"""
        response = client.post("/api/projects", json={
            "name": "Work",
            "color": "#ef4444"
        })
        assert response.status_code == 201
        assert response.json()["name"] == "Work"

    def test_get_all_projects(self, client):
        """Get all projects"""
        client.post("/api/projects", json={"name": "Work"})
        client.post("/api/projects", json={"name": "Personal"})

        response = client.get("/api/projects")
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_delete_project(self, client):
        """Delete a project"""
        create_response = client.post("/api/projects", json={"name": "Temp"})
        project_id = create_response.json()["id"]

        response = client.delete(f"/api/projects/{project_id}")
        assert response.status_code == 204


# ==================== FILTER TESTS ====================

class TestFiltering:
    """Test filtering capabilities"""

    def test_filter_tasks_by_status(self, client):
        """Filter tasks by status"""
        client.post("/api/tasks", json={"title": "Todo task", "status": "todo"})
        client.post("/api/tasks", json={"title": "Done task", "status": "done"})

        response = client.get("/api/tasks?status=done")
        assert response.status_code == 200
        tasks = response.json()
        assert len(tasks) == 1
        assert tasks[0]["title"] == "Done task"

    def test_filter_tasks_by_project(self, client):
        """Filter tasks by project"""
        project_response = client.post("/api/projects", json={"name": "Work"})
        project_id = project_response.json()["id"]

        client.post("/api/tasks", json={"title": "Work task", "project_id": project_id})
        client.post("/api/tasks", json={"title": "Personal task"})

        response = client.get(f"/api/tasks?project_id={project_id}")
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_filter_tasks_by_label(self, client):
        """Filter tasks by label"""
        label_response = client.post("/api/labels", json={"name": "Urgent"})
        label_id = label_response.json()["id"]

        client.post("/api/tasks", json={"title": "Urgent task", "label_ids": [label_id]})
        client.post("/api/tasks", json={"title": "Normal task"})

        response = client.get(f"/api/tasks?label_id={label_id}")
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_search_tasks(self, client):
        """Search tasks by title/description"""
        client.post("/api/tasks", json={"title": "Buy groceries", "description": "Milk and bread"})
        client.post("/api/tasks", json={"title": "Call mom"})

        response = client.get("/api/tasks?search=groceries")
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["title"] == "Buy groceries"


# ==================== STATISTICS TESTS ====================

class TestStatistics:
    """Test statistics endpoint"""

    def test_get_statistics(self, client):
        """Get task statistics"""
        client.post("/api/tasks", json={"title": "Task 1", "status": "todo"})
        client.post("/api/tasks", json={"title": "Task 2", "status": "done"})

        response = client.get("/api/statistics")
        assert response.status_code == 200
        stats = response.json()
        
        assert stats["total_tasks"] == 2
        assert stats["todo_count"] == 1
        assert stats["done_count"] == 1
        assert "completion_rate" in stats
        assert "tasks_by_priority" in stats


# ==================== EXPORT TESTS ====================

class TestExport:
    """Test export functionality"""

    def test_export_json(self, client):
        """Export data as JSON"""
        client.post("/api/tasks", json={"title": "Task 1"})
        client.post("/api/projects", json={"name": "Project 1"})

        response = client.get("/api/export/json")
        assert response.status_code == 200
        data = response.json()
        
        assert "tasks" in data
        assert "projects" in data
        assert "exported_at" in data

    def test_export_csv(self, client):
        """Export data as CSV"""
        client.post("/api/tasks", json={"title": "Task 1"})

        response = client.get("/api/export/csv")
        assert response.status_code == 200
        assert "csv" in response.json()


# ==================== EDGE CASE TESTS ====================

class TestEdgeCases:
    """Test edge cases and error handling"""

    def test_create_task_empty_title_fails(self, client):
        """Task must have a title"""
        response = client.post("/api/tasks", json={"title": ""})
        assert response.status_code == 422

    def test_update_nonexistent_task(self, client):
        """Cannot update task that doesn't exist"""
        response = client.put("/api/tasks/9999", json={"title": "New title"})
        assert response.status_code == 404

    def test_delete_nonexistent_task(self, client):
        """Cannot delete task that doesn't exist"""
        response = client.delete("/api/tasks/9999")
        assert response.status_code == 404

    def test_create_subtask_for_nonexistent_task(self, client):
        """Cannot create subtask for nonexistent task"""
        response = client.post("/api/subtasks", json={
            "title": "Orphan subtask",
            "task_id": 9999
        })
        assert response.status_code == 404

    def test_create_comment_for_nonexistent_task(self, client):
        """Cannot create comment for nonexistent task"""
        response = client.post("/api/comments", json={
            "content": "Orphan comment",
            "task_id": 9999
        })
        assert response.status_code == 404
