from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRead(BaseModel):
    id: UUID
    email: str
    role: str
    password_set: bool = True

    model_config = {"from_attributes": True}

    @classmethod
    def from_user(cls, user: object) -> "UserRead":
        from app.models import User

        assert isinstance(user, User)
        return cls(
            id=user.id,
            email=user.username,
            role=user.role,
            password_set=user.password_set,
        )


class UserListEntry(BaseModel):
    id: UUID
    email: str
    role: str
    password_set: bool
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_user(cls, user: object) -> "UserListEntry":
        from app.models import User

        assert isinstance(user, User)
        return cls(
            id=user.id,
            email=user.username,
            role=user.role,
            password_set=user.password_set,
            created_at=user.created_at,
        )


class UserAdminCreate(BaseModel):
    email: EmailStr
    role: str = Field(pattern="^(admin|operator)$")


class UserCreatedResponse(UserRead):
    email_sent: bool
    invite_url: str | None = None


class InviteVerifyResponse(BaseModel):
    email: str
    valid: bool


class AcceptInviteRequest(BaseModel):
    token: str = Field(min_length=10)
    password: str = Field(min_length=6)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=6)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str


class UserUpdate(BaseModel):
    role: str | None = Field(default=None, pattern="^(admin|operator)$")
    password: str | None = Field(default=None, min_length=6)


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=255)  # email for bootstrap register
    password: str = Field(min_length=6)
    role: str = Field(pattern="^(admin|operator)$")


class BinCreate(BaseModel):
    id: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=255)
    location_notes: str | None = None


class BinSummary(BaseModel):
    id: str
    name: str
    location_notes: str | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class ItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=128)
    sku: str | None = None


class ItemRead(BaseModel):
    id: UUID
    name: str
    category: str
    sku: str | None

    model_config = {"from_attributes": True}


class BinContentRead(BaseModel):
    item: ItemRead
    quantity: int
    updated_at: datetime


class BinDetail(BinSummary):
    contents: list[BinContentRead]


class InventoryAdjust(BaseModel):
    item_id: UUID
    change_amount: int
    notes: str | None = None


class InventoryLogRead(BaseModel):
    id: UUID
    bin_id: str
    item_id: UUID
    user_id: UUID
    change_amount: int
    previous_quantity: int
    new_quantity: int
    notes: str | None
    timestamp: datetime

    model_config = {"from_attributes": True}


class ItemBinSearchHit(BaseModel):
    bin_id: str
    bin_name: str
    item: ItemRead
    quantity: int


class InventoryLogView(BaseModel):
    id: UUID
    bin_id: str
    bin_name: str
    item_id: UUID
    item_name: str
    user_id: UUID
    username: str
    change_amount: int
    previous_quantity: int
    new_quantity: int
    notes: str | None
    timestamp: datetime
