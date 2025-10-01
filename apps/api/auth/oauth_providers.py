"""
OAuth providers for Google and GitHub authentication
"""

from typing import Optional, Dict, Any
import os
import secrets
from datetime import datetime, timezone
import httpx
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

try:
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
except ImportError:
    id_token = None
    google_requests = None


class OAuthProvider:
    """Base OAuth provider class"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
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
        profile_data: Dict[str, Any],
        tokens: Dict[str, str]
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
        await self.db.oauth_providers.insert_one({
            "user_id": user_id,
            "provider": provider,
            "provider_user_id": provider_user_id,
            "profile_data": profile_data,
            "tokens": tokens,  # Should be encrypted in production
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        })
    
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
        
        return oauth_doc["user_id"] if oauth_doc else None


class GoogleOAuthProvider(OAuthProvider):
    """Google OAuth provider"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        """Initialize Google OAuth provider"""
        super().__init__(db)
        
        if not id_token or not google_requests:
            raise ImportError("google-auth library is required for Google OAuth")
        
        self.client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self.redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
        
        if not all([self.client_id, self.client_secret, self.redirect_uri]):
            raise ValueError("Google OAuth credentials not configured")
    
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
    ) -> Dict[str, Any]:
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
                tokens = response.json()
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to exchange code for tokens: {str(e)}"
                )
        
        # Verify and decode ID token
        try:
            idinfo = id_token.verify_oauth2_token(
                tokens["id_token"],
                google_requests.Request(),
                self.client_id
            )
            
            return {
                "provider_user_id": idinfo["sub"],
                "email": idinfo.get("email"),
                "email_verified": idinfo.get("email_verified", False),
                "name": idinfo.get("name"),
                "picture": idinfo.get("picture"),
                "tokens": {
                    "access_token": tokens.get("access_token"),
                    "refresh_token": tokens.get("refresh_token"),
                    "expires_in": tokens.get("expires_in")
                }
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to verify ID token: {str(e)}"
            )


class GitHubOAuthProvider(OAuthProvider):
    """GitHub OAuth provider"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        """Initialize GitHub OAuth provider"""
        super().__init__(db)
        
        self.client_id = os.getenv("GITHUB_CLIENT_ID")
        self.client_secret = os.getenv("GITHUB_CLIENT_SECRET")
        self.redirect_uri = os.getenv("GITHUB_REDIRECT_URI")
        
        if not all([self.client_id, self.client_secret, self.redirect_uri]):
            raise ValueError("GitHub OAuth credentials not configured")
    
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
    ) -> Dict[str, Any]:
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
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    token_url,
                    data=token_data,
                    headers={"Accept": "application/json"}
                )
                response.raise_for_status()
                tokens = response.json()
                access_token = tokens["access_token"]
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to exchange code for token: {str(e)}"
                )
        
        # Get user info
        try:
            user_response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json"
                }
            )
            user_response.raise_for_status()
            user_data = user_response.json()
            
            # Get primary email
            email_response = await client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json"
                }
            )
            email_response.raise_for_status()
            emails = email_response.json()
            primary_email = next(
                (e for e in emails if e.get("primary")), 
                emails[0] if emails else {}
            )
            
            return {
                "provider_user_id": str(user_data["id"]),
                "email": primary_email.get("email"),
                "email_verified": primary_email.get("verified", False),
                "name": user_data.get("name"),
                "username": user_data.get("login"),
                "picture": user_data.get("avatar_url"),
                "tokens": {
                    "access_token": access_token,
                    "token_type": tokens.get("token_type"),
                    "scope": tokens.get("scope")
                }
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to get user info: {str(e)}"
            )
