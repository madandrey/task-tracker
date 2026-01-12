"""
TDD Tests for TaskFlow API
These tests define expected behavior before implementation
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

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
        """BDD: When I enter a task title and click add, I should see it in my task list"""
        response = client.post("/api/tasks", json={
            "title": "Buy groceries",
            "description": "Milk, bread, eggs"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Buy groceries"
        assert data["status"] == "todo"
        assert "id" in data

    def test_get_all_tasks(self, client):
        """BDD: I should see all my tasks on the board"""
        # Create two tasks
        client.post("/api/tasks", json={"title": "Task 1"})
        client.post("/api/tasks", json={"title": "Task 2"})

        response = client.get("/api/tasks")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_update_task_status(self, client):
        """BDD: When I mark the task as completed, the status should be done"""
        # Create task
        create_response = client.post("/api/tasks", json={"title": "Complete me"})
        task_id = create_response.json()["id"]

        # Update status
        response = client.put(f"/api/tasks/{task_id}", json={"status": "done"})
        assert response.status_code == 200
        assert response.json()["status"] == "done"

    def test_delete_task(self, client):
        """BDD: When I delete the task, it should be removed from the list"""
        # Create task
        create_response = client.post("/api/tasks", json={"title": "Delete me"})
        task_id = create_response.json()["id"]

        # Delete
        response = client.delete(f"/api/tasks/{task_id}")
        assert response.status_code == 204

        # Verify deleted
        get_response = client.get("/api/tasks")
        assert len(get_response.json()) == 0

    def test_task_priority(self, client):
        """BDD: When I set priority to high, the task should have high priority"""
        response = client.post("/api/tasks", json={
            "title": "Urgent task",
            "priority": "high"
        })
        assert response.status_code == 201
        assert response.json()["priority"] == "high"

    def test_move_task_to_in_progress(self, client):
        """BDD: When I move task to in_progress, status should change"""
        create_response = client.post("/api/tasks", json={"title": "Work on this"})
        task_id = create_response.json()["id"]

        response = client.put(f"/api/tasks/{task_id}", json={"status": "in_progress"})
        assert response.status_code == 200
        assert response.json()["status"] == "in_progress"


# ==================== PROJECT TESTS ====================

class TestProjectCRUD:
    """Test Project management"""

    def test_create_project(self, client):
        """BDD: When I create a new project, I should see it in my project list"""
        response = client.post("/api/projects", json={
            "name": "Work",
            "color": "#ef4444"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Work"
        assert data["color"] == "#ef4444"

    def test_get_all_projects(self, client):
        """BDD: I should see all projects"""
        client.post("/api/projects", json={"name": "Work"})
        client.post("/api/projects", json={"name": "Personal"})

        response = client.get("/api/projects")
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_delete_project(self, client):
        """BDD: When I delete a project, it should be removed"""
        create_response = client.post("/api/projects", json={"name": "Temp"})
        project_id = create_response.json()["id"]

        response = client.delete(f"/api/projects/{project_id}")
        assert response.status_code == 204

    def test_assign_task_to_project(self, client):
        """BDD: When I assign task to project, they should be linked"""
        # Create project
        project_response = client.post("/api/projects", json={"name": "Work"})
        project_id = project_response.json()["id"]

        # Create task with project
        task_response = client.post("/api/tasks", json={
            "title": "Meeting notes",
            "project_id": project_id
        })
        assert task_response.status_code == 201
        assert task_response.json()["project_id"] == project_id


# ==================== FILTER TESTS ====================

class TestFiltering:
    """Test filtering capabilities"""

    def test_filter_tasks_by_status(self, client):
        """BDD: Filter tasks by status"""
        client.post("/api/tasks", json={"title": "Todo task", "status": "todo"})
        client.post("/api/tasks", json={"title": "Done task", "status": "done"})

        response = client.get("/api/tasks?status=done")
        assert response.status_code == 200
        tasks = response.json()
        assert len(tasks) == 1
        assert tasks[0]["title"] == "Done task"

    def test_filter_tasks_by_project(self, client):
        """BDD: When I select project filter, I should only see tasks from that project"""
        # Create project
        project_response = client.post("/api/projects", json={"name": "Work"})
        project_id = project_response.json()["id"]

        # Create tasks
        client.post("/api/tasks", json={"title": "Work task", "project_id": project_id})
        client.post("/api/tasks", json={"title": "Personal task"})

        response = client.get(f"/api/tasks?project_id={project_id}")
        assert response.status_code == 200
        tasks = response.json()
        assert len(tasks) == 1
        assert tasks[0]["title"] == "Work task"


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

