"""
OTP (One-Time Password) providers for Email, SMS, and WhatsApp
"""

from datetime import datetime, timedelta, timezone
from typing import Literal, Mapping, cast
import os
import secrets
import hashlib
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import HTTPException, status
from apps.api.db_types import Database, DocumentDict

# Import Twilio (will be installed via requirements.txt)
try:
    from twilio.rest import Client as TwilioClient
except ImportError:
    TwilioClient = None


class OTPProvider:
    """Base OTP provider class"""
    
    def __init__(self, db: Database):
        """
        Initialize OTP provider.
        
        Args:
            db: Database connection
        """
        self.db = db
        self.otp_expiry_minutes = 10
        self.max_attempts = 3
    
    def generate_otp(self) -> str:
        """Generate a 6-digit OTP code"""
        return str(secrets.randbelow(1000000)).zfill(6)
    
    def hash_otp(self, otp: str) -> str:
        """Hash OTP for secure storage"""
        return hashlib.sha256(otp.encode()).hexdigest()
    
    async def store_otp(
        self,
        identifier: str,
        otp: str,
        method: Literal['email', 'sms', 'whatsapp'],
        purpose: Literal['login', 'registration', 'verification']
    ) -> None:
        """
        Store OTP in database.
        
        Args:
            identifier: Email or phone number
            otp: OTP code
            method: Delivery method
            purpose: OTP purpose
        """
        otp_hash = self.hash_otp(otp)

        otp_document: DocumentDict = {
            "identifier": identifier,
            "otp_hash": otp_hash,
            "method": method,
            "purpose": purpose,
            "attempts": 0,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(
                minutes=self.otp_expiry_minutes
            ),
            "verified": False
        }

        await self.db.otp_verifications.insert_one(otp_document)
    
    async def verify_otp(
        self,
        identifier: str,
        otp: str,
        purpose: Literal['login', 'registration', 'verification']
    ) -> bool:
        """
        Verify OTP code.
        
        Args:
            identifier: Email or phone number
            otp: OTP code to verify
            purpose: OTP purpose
            
        Returns:
            bool: True if valid, False otherwise
            
        Raises:
            HTTPException: If OTP expired or max attempts exceeded
        """
        otp_hash = self.hash_otp(otp)
        
        # Find OTP record
        otp_doc = await self.db.otp_verifications.find_one({
            "identifier": identifier,
            "purpose": purpose,
            "verified": False,
            "expires_at": {"$gt": datetime.now(timezone.utc)}
        })
        
        if not otp_doc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP not found or expired"
            )
        
        # Check attempts
        attempts = cast(int, otp_doc.get("attempts", 0))
        if attempts >= self.max_attempts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum OTP attempts exceeded"
            )
        
        # Increment attempts
        await self.db.otp_verifications.update_one(
            {"_id": otp_doc["_id"]},
            {"$inc": {"attempts": 1}}
        )
        
        # Verify OTP
        if cast(str, otp_doc.get("otp_hash")) == otp_hash:
            # Mark as verified
            await self.db.otp_verifications.update_one(
                {"_id": otp_doc["_id"]},
                {"$set": {"verified": True, "verified_at": datetime.now(timezone.utc)}}
            )
            return True
        
        return False


class EmailOTPProvider(OTPProvider):
    """Email OTP provider using SMTP"""
    
    def __init__(self, db: Database):
        """Initialize email OTP provider"""
        super().__init__(db)
        
        smtp_host = os.getenv("SMTP_HOST")
        smtp_username = os.getenv("SMTP_USERNAME")
        smtp_password = os.getenv("SMTP_PASSWORD")
        if smtp_host is None or smtp_username is None or smtp_password is None:
            raise ValueError("SMTP credentials not configured")

        from_email = os.getenv("SMTP_FROM_EMAIL") or smtp_username

        self.smtp_host = smtp_host
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = smtp_username
        self.smtp_password = smtp_password
        self.from_email = from_email
    
    async def send_otp(
        self,
        email: str,
        purpose: Literal['login', 'registration', 'verification']
    ) -> None:
        """
        Send OTP via email.
        
        Args:
            email: Recipient email address
            purpose: OTP purpose
            
        Raises:
            HTTPException: If email sending fails
        """
        # Generate and store OTP
        otp = self.generate_otp()
        await self.store_otp(email, otp, 'email', purpose)
        
        # Create email message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Your BrainSAIT RCM Verification Code: {otp}"
        msg['From'] = self.from_email
        msg['To'] = email
        
        # Email body
        text = f"""
        Your BrainSAIT RCM verification code is: {otp}
        
        This code will expire in {self.otp_expiry_minutes} minutes.
        If you didn't request this code, please ignore this email.
        """
        
        html = f"""
        <html>
          <body>
            <h2>BrainSAIT RCM Verification</h2>
            <p>Your verification code is:</p>
            <h1 style="color: #4F46E5; font-size: 32px;">{otp}</h1>
            <p>This code will expire in {self.otp_expiry_minutes} minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </body>
        </html>
        """
        
        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, 'html')
        msg.attach(part1)
        msg.attach(part2)
        
        # Send email
        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send OTP email: {str(e)}"
            )


class SMSOTPProvider(OTPProvider):
    """SMS OTP provider using Twilio"""
    
    def __init__(self, db: Database):
        """Initialize SMS OTP provider"""
        super().__init__(db)
        
        if not TwilioClient:
            raise ImportError("Twilio SDK is required for SMS OTP")
        
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        from_phone = os.getenv("TWILIO_PHONE_NUMBER")
        
        if account_sid is None or auth_token is None or from_phone is None:
            raise ValueError("Twilio credentials not configured")
        
        self.from_phone = from_phone
        self.client = TwilioClient(account_sid, auth_token)
    
    async def send_otp(
        self,
        phone: str,
        purpose: Literal['login', 'registration', 'verification']
    ) -> None:
        """
        Send OTP via SMS.
        
        Args:
            phone: Recipient phone number (E.164 format)
            purpose: OTP purpose
            
        Raises:
            HTTPException: If SMS sending fails
        """
        # Generate and store OTP
        otp = self.generate_otp()
        await self.store_otp(phone, otp, 'sms', purpose)
        
        # Send SMS
        try:
            message = self.client.messages.create(
                body=f"Your BrainSAIT RCM verification code is: {otp}. "
                     f"Valid for {self.otp_expiry_minutes} minutes.",
                from_=self.from_phone,
                to=phone
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send OTP SMS: {str(e)}"
            )


class WhatsAppOTPProvider(OTPProvider):
    """WhatsApp OTP provider using Twilio WhatsApp Business API"""
    
    def __init__(self, db: Database):
        """Initialize WhatsApp OTP provider"""
        super().__init__(db)
        
        if not TwilioClient:
            raise ImportError("Twilio SDK is required for WhatsApp OTP")
        
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        from_whatsapp = os.getenv("TWILIO_WHATSAPP_NUMBER")
        
        if account_sid is None or auth_token is None or from_whatsapp is None:
            raise ValueError("Twilio WhatsApp credentials not configured")
        
        self.from_whatsapp = from_whatsapp
        self.client = TwilioClient(account_sid, auth_token)
    
    async def send_otp(
        self,
        phone: str,
        purpose: Literal['login', 'registration', 'verification']
    ) -> None:
        """
        Send OTP via WhatsApp.
        
        Args:
            phone: Recipient phone number (E.164 format)
            purpose: OTP purpose
            
        Raises:
            HTTPException: If WhatsApp message sending fails
        """
        # Generate and store OTP
        otp = self.generate_otp()
        await self.store_otp(phone, otp, 'whatsapp', purpose)
        
        # Send WhatsApp message
        try:
            message = self.client.messages.create(
                body=f"🔐 Your BrainSAIT RCM verification code is: *{otp}*\n\n"
                     f"Valid for {self.otp_expiry_minutes} minutes.\n"
                     f"Don't share this code with anyone.",
                from_=f"whatsapp:{self.from_whatsapp}",
                to=f"whatsapp:{phone}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send OTP via WhatsApp: {str(e)}"
            )
