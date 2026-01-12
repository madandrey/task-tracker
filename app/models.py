from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Boolean, Text, Table
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime, timezone
import enum
import hashlib
import secrets

Base = declarative_base()


def utc_now():
    return datetime.now(timezone.utc)


def hash_password(password: str, salt: str = None) -> tuple[str, str]:
    """Hash password with salt"""
    if salt is None:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return hashed.hex(), salt


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(128), nullable=False)
    password_salt = Column(String(32), nullable=False)
    full_name = Column(String(200), default="")
    avatar_color = Column(String(7), default="#6366f1")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    last_login = Column(DateTime, nullable=True)

    tasks = relationship("Task", back_populates="owner")
    projects = relationship("Project", back_populates="owner")

    def verify_password(self, password: str) -> bool:
        hashed, _ = hash_password(password, self.password_salt)
        return hashed == self.password_hash

    def set_password(self, password: str):
        self.password_hash, self.password_salt = hash_password(password)


class TaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    ARCHIVED = "archived"


class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


# Many-to-many relationship table for tasks and labels
task_labels = Table(
    'task_labels',
    Base.metadata,
    Column('task_id', Integer, ForeignKey('tasks.id'), primary_key=True),
    Column('label_id', Integer, ForeignKey('labels.id'), primary_key=True)
)


class Board(Base):
    __tablename__ = "boards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500), default="")
    icon = Column(String(10), default="📋")
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

    projects = relationship("Project", back_populates="board", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    color = Column(String(7), default="#6366f1")
    board_id = Column(Integer, ForeignKey("boards.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    board = relationship("Board", back_populates="projects")
    owner = relationship("User", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")


class Label(Base):
    __tablename__ = "labels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    color = Column(String(7), default="#6366f1")
    created_at = Column(DateTime, default=utc_now)

    tasks = relationship("Task", secondary=task_labels, back_populates="labels")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(String(2000), default="")
    status = Column(Enum(TaskStatus), default=TaskStatus.TODO)
    priority = Column(Enum(TaskPriority), default=TaskPriority.MEDIUM)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    position = Column(Integer, default=0)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    project = relationship("Project", back_populates="tasks")
    owner = relationship("User", back_populates="tasks")
    subtasks = relationship("Subtask", back_populates="task", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="task", cascade="all, delete-orphan")
    labels = relationship("Label", secondary=task_labels, back_populates="tasks")


class Subtask(Base):
    __tablename__ = "subtasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    is_completed = Column(Boolean, default=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    position = Column(Integer, default=0)
    created_at = Column(DateTime, default=utc_now)

    task = relationship("Task", back_populates="subtasks")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    task = relationship("Task", back_populates="comments")
