"""
TaskFlow - Beautiful Task Tracker
Main FastAPI Application
"""
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from pathlib import Path

from app.database import get_db, init_db
from app.models import Task, Project, TaskStatus, TaskPriority
from app.schemas import (
    TaskCreate, TaskUpdate, TaskResponse,
    ProjectCreate, ProjectResponse
)

app = FastAPI(
    title="TaskFlow",
    description="Beautiful Task Tracker API",
    version="1.0.0"
)

# Mount static files
static_path = Path(__file__).parent / "static"
if static_path.exists():
    app.mount("/static", StaticFiles(directory=static_path), name="static")


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def root():
    return FileResponse(static_path / "index.html")


# ==================== TASK ENDPOINTS ====================

@app.get("/api/tasks", response_model=list[TaskResponse])
def get_tasks(
    status: Optional[TaskStatus] = Query(None),
    project_id: Optional[int] = Query(None),
    priority: Optional[TaskPriority] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all tasks with optional filters"""
    query = db.query(Task)
    
    if status:
        query = query.filter(Task.status == status)
    if project_id:
        query = query.filter(Task.project_id == project_id)
    if priority:
        query = query.filter(Task.priority == priority)
    
    return query.order_by(Task.created_at.desc()).all()


@app.post("/api/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task"""
    if not task.title.strip():
        raise HTTPException(status_code=422, detail="Title cannot be empty")
    
    db_task = Task(
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        project_id=task.project_id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@app.put("/api/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task: TaskUpdate, db: Session = Depends(get_db)):
    """Update an existing task"""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_task, field, value)
    
    db.commit()
    db.refresh(db_task)
    return db_task


@app.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task"""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(db_task)
    db.commit()
    return None


# ==================== PROJECT ENDPOINTS ====================

@app.get("/api/projects", response_model=list[ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    """Get all projects"""
    return db.query(Project).order_by(Project.created_at.desc()).all()


@app.post("/api/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """Create a new project"""
    db_project = Project(name=project.name, color=project.color)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


@app.delete("/api/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    """Delete a project and all its tasks"""
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(db_project)
    db.commit()
    return None


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

