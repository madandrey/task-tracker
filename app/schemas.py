from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models import TaskStatus, TaskPriority


class ProjectBase(BaseModel):
    name: str
    color: str = "#6366f1"


class ProjectCreate(ProjectBase):
    pass


class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TaskBase(BaseModel):
    title: str
    description: str = ""
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    project_id: Optional[int] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    project_id: Optional[int] = None


class TaskResponse(TaskBase):
    id: int
    created_at: datetime
    updated_at: datetime
    project: Optional[ProjectResponse] = None

    class Config:
        from_attributes = True

