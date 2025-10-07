"""Shared type aliases for FastAPI services."""

from typing import TypeAlias

from motor.motor_asyncio import AsyncIOMotorDatabase

DocumentDict: TypeAlias = dict[str, object]
Database: TypeAlias = AsyncIOMotorDatabase[DocumentDict]
