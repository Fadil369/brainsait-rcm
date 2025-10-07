"""
OAuth providers for Google and GitHub authentication
"""

from typing import Mapping, Optional, TypedDict, cast
import os
import secrets
from datetime import datetime, timezone
import httpx
from fastapi import HTTPException, status
from apps.api.db_types import Database, DocumentDict

try:
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
except ImportError:
    id_token = None
    google_requests = None


class OAuthProvider:
    """Base OAuth provider class"""
    
    def __init__(self, db: Database):
        """
        Initialize OAuth provider.
        
        Args:
            db: Database connection
        """
        self.db = db
    
    async def link_account(
        self,
        user_id: str,
        provider: str,
        provider_user_id: str,
    profile_data: Mapping[str, object],
    tokens: Mapping[str, object]
    ) -> None:
        """
        Link OAuth account to user.
        
        Args:
            user_id: User ID
            provider: OAuth provider name
            provider_user_id: Provider's user ID
            profile_data: User profile data from provider
            tokens: OAuth tokens (access_token, refresh_token, etc.)
        """
        # Store encrypted tokens (basic encryption for now)
        document: DocumentDict = {
            "user_id": user_id,
            "provider": provider,
            "provider_user_id": provider_user_id,
            "profile_data": dict(profile_data),
            "tokens": dict(tokens),  # Should be encrypted in production
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await self.db.oauth_providers.insert_one(document)
    
    async def find_linked_account(
        self,
        provider: str,
        provider_user_id: str
    ) -> Optional[str]:
        """
        Find user by linked OAuth account.
        
        Args:
            provider: OAuth provider name
            provider_user_id: Provider's user ID
            
        Returns:
            Optional[str]: User ID if found, None otherwise
        """
        oauth_doc = await self.db.oauth_providers.find_one({
            "provider": provider,
            "provider_user_id": provider_user_id
        })
        
        if not oauth_doc:
            return None
        return cast(str, oauth_doc["user_id"])


class GoogleOAuthProvider(OAuthProvider):
    """Google OAuth provider"""
    
    def __init__(self, db: Database):
        """Initialize Google OAuth provider"""
        super().__init__(db)
        
        if not id_token or not google_requests:
            raise ImportError("google-auth library is required for Google OAuth")
        
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
        
        if client_id is None or client_secret is None or redirect_uri is None:
            raise ValueError("Google OAuth credentials not configured")
        
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
    
    def get_authorization_url(self, state: Optional[str] = None) -> str:
        """
        Get Google OAuth authorization URL.
        
        Args:
            state: Optional state parameter for CSRF protection
            
        Returns:
            str: Authorization URL
        """
        if not state:
            state = secrets.token_urlsafe(32)
        
        scopes = [
            "openid",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile"
        ]
        
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": " ".join(scopes),
            "state": state,
            "access_type": "offline",
            "prompt": "consent"
        }
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"https://accounts.google.com/o/oauth2/v2/auth?{query_string}"
    
    async def exchange_code(
        self,
        code: str
    ) -> DocumentDict:
        """
        Exchange authorization code for tokens and user info.
        
        Args:
            code: Authorization code
            
        Returns:
            Dict containing user info and tokens
            
        Raises:
            HTTPException: If token exchange fails
        """
        # Exchange code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": self.redirect_uri
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(token_url, data=token_data)
                response.raise_for_status()
                tokens = cast(DocumentDict, response.json())
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to exchange code for tokens: {str(e)}"
                )
        
        # Verify and decode ID token
        if id_token is None or google_requests is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth dependencies are not available"
            )

        try:
            idinfo = cast(
                DocumentDict,
                id_token.verify_oauth2_token(
                    tokens["id_token"],
                    google_requests.Request(),
                    self.client_id
                )
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to verify ID token: {exc}"
            ) from exc

        return {
            "provider_user_id": cast(str, idinfo["sub"]),
            "email": idinfo.get("email"),
            "email_verified": bool(idinfo.get("email_verified", False)),
            "name": idinfo.get("name"),
            "picture": idinfo.get("picture"),
            "tokens": {
                "access_token": tokens.get("access_token"),
                "refresh_token": tokens.get("refresh_token"),
                "expires_in": tokens.get("expires_in")
            }
        }


class GitHubOAuthProvider(OAuthProvider):
    """GitHub OAuth provider"""
    
    def __init__(self, db: Database):
        """Initialize GitHub OAuth provider"""
        super().__init__(db)
        
        client_id = os.getenv("GITHUB_CLIENT_ID")
        client_secret = os.getenv("GITHUB_CLIENT_SECRET")
        redirect_uri = os.getenv("GITHUB_REDIRECT_URI")
        
        if client_id is None or client_secret is None or redirect_uri is None:
            raise ValueError("GitHub OAuth credentials not configured")
        
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
    
    def get_authorization_url(self, state: Optional[str] = None) -> str:
        """
        Get GitHub OAuth authorization URL.
        
        Args:
            state: Optional state parameter for CSRF protection
            
        Returns:
            str: Authorization URL
        """
        if not state:
            state = secrets.token_urlsafe(32)
        
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": "user:email",
            "state": state
        }
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"https://github.com/login/oauth/authorize?{query_string}"
    
    async def exchange_code(
        self,
        code: str
    ) -> DocumentDict:
        """
        Exchange authorization code for tokens and user info.
        
        Args:
            code: Authorization code
            
        Returns:
            Dict containing user info and tokens
            
        Raises:
            HTTPException: If token exchange fails
        """
        # Exchange code for access token
        token_url = "https://github.com/login/oauth/access_token"
        token_data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "redirect_uri": self.redirect_uri
        }
        
        emails_raw: object | None = None
        user_data: DocumentDict | None = None
        tokens: DocumentDict | None = None
        access_token: str | None = None

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    token_url,
                    data=token_data,
                    headers={"Accept": "application/json"}
                )
                response.raise_for_status()
                tokens = cast(DocumentDict, response.json())
                access_token = cast(str, tokens["access_token"])
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to exchange code for token: {str(e)}"
                )

            try:
                user_response = await client.get(
                    "https://api.github.com/user",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/json"
                    }
                )
                user_response.raise_for_status()
                user_data = cast(DocumentDict, user_response.json())

                email_response = await client.get(
                    "https://api.github.com/user/emails",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/json"
                    }
                )
                email_response.raise_for_status()
                emails_raw = email_response.json()
            except Exception as e:  # pragma: no cover - network dependencies
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to get user info: {str(e)}"
                )

        if (
            tokens is None
            or user_data is None
            or emails_raw is None
            or access_token is None
        ):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="GitHub OAuth response was incomplete"
            )

        emails = cast(list[DocumentDict], emails_raw)
        primary_email = next(
            (email for email in emails if email.get("primary")),
            emails[0] if emails else {}
        )
        primary_email_doc = cast(DocumentDict, primary_email)

        return {
            "provider_user_id": str(user_data["id"]),
            "email": primary_email_doc.get("email"),
            "email_verified": bool(primary_email_doc.get("verified", False)),
            "name": user_data.get("name"),
            "username": user_data.get("login"),
            "picture": user_data.get("avatar_url"),
            "tokens": {
                "access_token": access_token,
                "token_type": tokens.get("token_type"),
                "scope": tokens.get("scope")
            }
        }
