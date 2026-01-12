"""
TaskFlow - Beautiful Task Tracker (Production Version)
Main FastAPI Application
"""
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Optional
from pathlib import Path
from datetime import datetime, timedelta, timezone
import json

from app.database import get_db, init_db
from app.models import Task, Project, Label, Subtask, Comment, Board, TaskStatus, TaskPriority, task_labels
from app.schemas import (
    TaskCreate, TaskUpdate, TaskResponse, TaskBrief, TaskStatistics,
    ProjectCreate, ProjectResponse,
    LabelCreate, LabelResponse,
    SubtaskCreate, SubtaskUpdate, SubtaskResponse,
    CommentCreate, CommentResponse,
    BoardCreate, BoardResponse
)

app = FastAPI(
    title="TaskFlow",
    description="Beautiful Task Tracker API - Production Ready",
    version="2.0.0"
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


# ==================== BOARD ENDPOINTS ====================

@app.get("/api/boards", response_model=list[BoardResponse])
def get_boards(db: Session = Depends(get_db)):
    """Get all boards"""
    return db.query(Board).order_by(Board.created_at.desc()).all()


@app.post("/api/boards", response_model=BoardResponse, status_code=status.HTTP_201_CREATED)
def create_board(board: BoardCreate, db: Session = Depends(get_db)):
    """Create a new board"""
    db_board = Board(**board.model_dump())
    db.add(db_board)
    db.commit()
    db.refresh(db_board)
    return db_board


@app.delete("/api/boards/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board(board_id: int, db: Session = Depends(get_db)):
    """Delete a board"""
    db_board = db.query(Board).filter(Board.id == board_id).first()
    if not db_board:
        raise HTTPException(status_code=404, detail="Board not found")
    db.delete(db_board)
    db.commit()
    return None


# ==================== TASK ENDPOINTS ====================

@app.get("/api/tasks", response_model=list[TaskResponse])
def get_tasks(
    status: Optional[TaskStatus] = Query(None),
    project_id: Optional[int] = Query(None),
    priority: Optional[TaskPriority] = Query(None),
    label_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    include_archived: bool = Query(False),
    db: Session = Depends(get_db)
):
    """Get all tasks with optional filters"""
    query = db.query(Task)
    
    if not include_archived:
        query = query.filter(Task.status != TaskStatus.ARCHIVED)
    
    if status:
        query = query.filter(Task.status == status)
    if project_id:
        query = query.filter(Task.project_id == project_id)
    if priority:
        query = query.filter(Task.priority == priority)
    if label_id:
        query = query.filter(Task.labels.any(Label.id == label_id))
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Task.title.ilike(search_term),
                Task.description.ilike(search_term)
            )
        )
    
    return query.order_by(Task.position, Task.created_at.desc()).all()


@app.get("/api/tasks/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    """Get a single task with all details"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.post("/api/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task"""
    if not task.title.strip():
        raise HTTPException(status_code=422, detail="Title cannot be empty")
    
    # Get labels if provided
    labels = []
    if task.label_ids:
        labels = db.query(Label).filter(Label.id.in_(task.label_ids)).all()
    
    db_task = Task(
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        project_id=task.project_id,
        due_date=task.due_date,
        labels=labels
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
    
    # Handle labels separately
    if 'label_ids' in update_data:
        label_ids = update_data.pop('label_ids')
        if label_ids is not None:
            db_task.labels = db.query(Label).filter(Label.id.in_(label_ids)).all()
    
    # Track completion
    if 'status' in update_data:
        if update_data['status'] == TaskStatus.DONE and db_task.status != TaskStatus.DONE:
            db_task.completed_at = datetime.now(timezone.utc)
        elif update_data['status'] != TaskStatus.DONE:
            db_task.completed_at = None
    
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


@app.post("/api/tasks/{task_id}/archive", response_model=TaskResponse)
def archive_task(task_id: int, db: Session = Depends(get_db)):
    """Archive a task"""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db_task.status = TaskStatus.ARCHIVED
    db.commit()
    db.refresh(db_task)
    return db_task


# ==================== SUBTASK ENDPOINTS ====================

@app.post("/api/subtasks", response_model=SubtaskResponse, status_code=status.HTTP_201_CREATED)
def create_subtask(subtask: SubtaskCreate, db: Session = Depends(get_db)):
    """Create a new subtask"""
    task = db.query(Task).filter(Task.id == subtask.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db_subtask = Subtask(**subtask.model_dump())
    db.add(db_subtask)
    db.commit()
    db.refresh(db_subtask)
    return db_subtask


@app.put("/api/subtasks/{subtask_id}", response_model=SubtaskResponse)
def update_subtask(subtask_id: int, subtask: SubtaskUpdate, db: Session = Depends(get_db)):
    """Update a subtask"""
    db_subtask = db.query(Subtask).filter(Subtask.id == subtask_id).first()
    if not db_subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    update_data = subtask.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_subtask, field, value)
    
    db.commit()
    db.refresh(db_subtask)
    return db_subtask


@app.delete("/api/subtasks/{subtask_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subtask(subtask_id: int, db: Session = Depends(get_db)):
    """Delete a subtask"""
    db_subtask = db.query(Subtask).filter(Subtask.id == subtask_id).first()
    if not db_subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    db.delete(db_subtask)
    db.commit()
    return None


# ==================== COMMENT ENDPOINTS ====================

@app.post("/api/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(comment: CommentCreate, db: Session = Depends(get_db)):
    """Create a new comment"""
    task = db.query(Task).filter(Task.id == comment.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db_comment = Comment(**comment.model_dump())
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment


@app.delete("/api/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(comment_id: int, db: Session = Depends(get_db)):
    """Delete a comment"""
    db_comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not db_comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    db.delete(db_comment)
    db.commit()
    return None


# ==================== LABEL ENDPOINTS ====================

@app.get("/api/labels", response_model=list[LabelResponse])
def get_labels(db: Session = Depends(get_db)):
    """Get all labels"""
    return db.query(Label).order_by(Label.name).all()


@app.post("/api/labels", response_model=LabelResponse, status_code=status.HTTP_201_CREATED)
def create_label(label: LabelCreate, db: Session = Depends(get_db)):
    """Create a new label"""
    db_label = Label(**label.model_dump())
    db.add(db_label)
    db.commit()
    db.refresh(db_label)
    return db_label


@app.delete("/api/labels/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_label(label_id: int, db: Session = Depends(get_db)):
    """Delete a label"""
    db_label = db.query(Label).filter(Label.id == label_id).first()
    if not db_label:
        raise HTTPException(status_code=404, detail="Label not found")
    
    db.delete(db_label)
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
    db_project = Project(**project.model_dump())
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


# ==================== STATISTICS ENDPOINTS ====================

@app.get("/api/statistics", response_model=TaskStatistics)
def get_statistics(db: Session = Depends(get_db)):
    """Get task statistics"""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    
    total = db.query(Task).count()
    todo = db.query(Task).filter(Task.status == TaskStatus.TODO).count()
    in_progress = db.query(Task).filter(Task.status == TaskStatus.IN_PROGRESS).count()
    done = db.query(Task).filter(Task.status == TaskStatus.DONE).count()
    archived = db.query(Task).filter(Task.status == TaskStatus.ARCHIVED).count()
    
    overdue = db.query(Task).filter(
        and_(
            Task.due_date < now,
            Task.status.in_([TaskStatus.TODO, TaskStatus.IN_PROGRESS])
        )
    ).count()
    
    completed_week = db.query(Task).filter(
        and_(
            Task.completed_at >= week_ago,
            Task.status == TaskStatus.DONE
        )
    ).count()
    
    # By priority
    priority_stats = {}
    for p in TaskPriority:
        count = db.query(Task).filter(Task.priority == p).count()
        priority_stats[p.value] = count
    
    # By project
    project_stats = {}
    projects = db.query(Project).all()
    for proj in projects:
        count = db.query(Task).filter(Task.project_id == proj.id).count()
        project_stats[proj.name] = count
    
    no_project = db.query(Task).filter(Task.project_id.is_(None)).count()
    if no_project > 0:
        project_stats["No Project"] = no_project
    
    completion_rate = (done / total * 100) if total > 0 else 0
    
    return TaskStatistics(
        total_tasks=total,
        todo_count=todo,
        in_progress_count=in_progress,
        done_count=done,
        archived_count=archived,
        overdue_count=overdue,
        tasks_by_priority=priority_stats,
        tasks_by_project=project_stats,
        completed_this_week=completed_week,
        completion_rate=round(completion_rate, 1)
    )


# ==================== EXPORT ENDPOINTS ====================

@app.get("/api/export/json")
def export_json(db: Session = Depends(get_db)):
    """Export all data as JSON"""
    tasks = db.query(Task).all()
    projects = db.query(Project).all()
    labels = db.query(Label).all()
    
    data = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "projects": [{"id": p.id, "name": p.name, "color": p.color} for p in projects],
        "labels": [{"id": l.id, "name": l.name, "color": l.color} for l in labels],
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "status": t.status.value,
                "priority": t.priority.value,
                "project_id": t.project_id,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "subtasks": [{"title": s.title, "completed": s.is_completed} for s in t.subtasks],
                "labels": [l.id for l in t.labels]
            }
            for t in tasks
        ]
    }
    
    return JSONResponse(content=data, headers={
        "Content-Disposition": "attachment; filename=taskflow-export.json"
    })


@app.get("/api/export/csv")
def export_csv(db: Session = Depends(get_db)):
    """Export tasks as CSV"""
    tasks = db.query(Task).all()
    
    csv_lines = ["ID,Title,Status,Priority,Project,Due Date,Created At"]
    for t in tasks:
        project_name = t.project.name if t.project else ""
        due = t.due_date.strftime("%Y-%m-%d") if t.due_date else ""
        created = t.created_at.strftime("%Y-%m-%d") if t.created_at else ""
        # Escape quotes in title
        title = t.title.replace('"', '""')
        csv_lines.append(f'{t.id},"{title}",{t.status.value},{t.priority.value},"{project_name}",{due},{created}')
    
    csv_content = "\n".join(csv_lines)
    
    return JSONResponse(
        content={"csv": csv_content},
        headers={"Content-Disposition": "attachment; filename=taskflow-export.csv"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
