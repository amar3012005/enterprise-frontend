from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
import uuid
import enum
from datetime import datetime
from .session import Base

class LoginMode(enum.Enum):
    DEMO = "demo"
    ENTERPRISE = "enterprise"
    ADMIN = "admin"


class Tenant(Base):
    __tablename__ = "tenants"

    tenant_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_name = Column(String, nullable=False)
    subdomain = Column(String, nullable=False, unique=True)
    address = Column(Text, nullable=True)
    plan_tier = Column(String, default="enterprise")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="tenant")

class User(Base):
    __tablename__ = "users"

    user_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.tenant_id"), nullable=False)
    email = Column(String, nullable=False, unique=True)
    full_name = Column(String, nullable=False)
    phone_number = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="admin")
    login_mode = Column(Enum(LoginMode), default=LoginMode.DEMO, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="users")


class Agent(Base):
    __tablename__ = "agents"

    agent_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.tenant_id"), nullable=False)
    agent_name = Column(String, nullable=False)
    agent_description = Column(Text, nullable=True)
    cartesia_agent_id = Column(String, nullable=True)
    language_primary = Column(String, default="en", nullable=False)
    language_secondary = Column(String, nullable=True)
    websocket_url = Column(String, nullable=True)
    location = Column(String, nullable=True)  # Agent's geographical location
    configuration = Column(Text, nullable=True)  # Store as JSON string
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


    tenant = relationship("Tenant", back_populates="agents")

# Update Tenant to include agents relationship
Tenant.agents = relationship("Agent", back_populates="tenant")
