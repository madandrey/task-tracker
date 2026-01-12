from pydantic import BaseModel, ConfigDict, EmailStr
from datetime import datetime
from typing import Optional
from app.models import TaskStatus, TaskPriority


# ==================== User Schemas ====================
class UserBase(BaseModel):
    email: str
    username: str
    full_name: str = ""


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(UserBase):
    id: int
    avatar_color: str
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UserPublic(BaseModel):
    id: int
    username: str
    full_name: str
    avatar_color: str
    model_config = ConfigDict(from_attributes=True)


# ==================== Board Schemas ====================
class BoardBase(BaseModel):
    name: str
    description: str = ""
    icon: str = "📋"


class BoardCreate(BoardBase):
    pass


class BoardResponse(BoardBase):
    id: int
    is_default: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==================== Project Schemas ====================
class ProjectBase(BaseModel):
    name: str
    color: str = "#6366f1"
    board_id: Optional[int] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==================== Label Schemas ====================
class LabelBase(BaseModel):
    name: str
    color: str = "#6366f1"


class LabelCreate(LabelBase):
    pass


class LabelResponse(LabelBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==================== Subtask Schemas ====================
class SubtaskBase(BaseModel):
    title: str
    is_completed: bool = False


class SubtaskCreate(SubtaskBase):
    task_id: int


class SubtaskUpdate(BaseModel):
    title: Optional[str] = None
    is_completed: Optional[bool] = None


class SubtaskResponse(SubtaskBase):
    id: int
    task_id: int
    position: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==================== Comment Schemas ====================
class CommentBase(BaseModel):
    content: str


class CommentCreate(CommentBase):
    task_id: int


class CommentResponse(CommentBase):
    id: int
    task_id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==================== Task Schemas ====================
class TaskBase(BaseModel):
    title: str
    description: str = ""
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    project_id: Optional[int] = None
    due_date: Optional[datetime] = None


class TaskCreate(TaskBase):
    label_ids: list[int] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    project_id: Optional[int] = None
    due_date: Optional[datetime] = None
    position: Optional[int] = None
    label_ids: Optional[list[int]] = None


class TaskResponse(TaskBase):
    id: int
    position: int
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    project: Optional[ProjectResponse] = None
    subtasks: list[SubtaskResponse] = []
    comments: list[CommentResponse] = []
    labels: list[LabelResponse] = []
    model_config = ConfigDict(from_attributes=True)


class TaskBrief(BaseModel):
    """Brief task info for lists"""
    id: int
    title: str
    status: TaskStatus
    priority: TaskPriority
    due_date: Optional[datetime] = None
    subtask_count: int = 0
    subtask_completed: int = 0
    comment_count: int = 0
    labels: list[LabelResponse] = []
    project: Optional[ProjectResponse] = None
    model_config = ConfigDict(from_attributes=True)


# ==================== Statistics Schemas ====================
class TaskStatistics(BaseModel):
    total_tasks: int
    todo_count: int
    in_progress_count: int
    done_count: int
    archived_count: int
    overdue_count: int
    tasks_by_priority: dict[str, int]
    tasks_by_project: dict[str, int]
    completed_this_week: int
    completion_rate: float


class DailyStats(BaseModel):
    date: str
    created: int
    completed: int
