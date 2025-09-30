"""
BRAINSAIT: WhatsApp Notifications Service
Sends notifications and compliance letters via WhatsApp Business API
"""

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional

from twilio.rest import Client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class WhatsAppNotificationService:
    """
    Service for sending WhatsApp notifications
    Uses Twilio WhatsApp Business API
    """

    def __init__(self):
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.from_number = os.getenv('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')

        if not self.account_sid or not self.auth_token:
            logger.warning("Twilio credentials not configured. WhatsApp notifications disabled.")
            self.client = None
        else:
            self.client = Client(self.account_sid, self.auth_token)

    async def send_compliance_alert(
        self,
        to_number: str,
        insurance_company: str,
        days_overdue: int,
        total_amount: float
    ) -> Dict:
        """
        Send compliance alert for overdue rejections
        """
        message = f"""
🚨 *BrainSAIT Compliance Alert*

⚠️ *Overdue Rejection Statement*

Insurance Company: {insurance_company}
Days Overdue: {days_overdue} days
Total Amount: SAR {total_amount:,.2f}

Action required: Follow up immediately to avoid automatic payment assumption.

--
BrainSAIT Healthcare Solutions
        """.strip()

        return await self.send_message(to_number, message)

    async def send_rejection_notification(
        self,
        to_number: str,
        rejection_count: int,
        total_amount: float,
        rejection_rate: float
    ) -> Dict:
        """
        Send notification about new rejections
        """
        emoji = "✅" if rejection_rate < 10 else "⚠️" if rejection_rate < 20 else "🚨"

        message = f"""
{emoji} *New Rejections Received*

Total Rejections: {rejection_count}
Total Amount: SAR {total_amount:,.2f}
Rejection Rate: {rejection_rate:.1f}%

Please review and take appropriate action.

View details: https://rcm.brainsait.com/rejections

--
BrainSAIT RCM System
        """.strip()

        return await self.send_message(to_number, message)

    async def send_appeal_update(
        self,
        to_number: str,
        appeal_id: str,
        status: str,
        recovered_amount: Optional[float] = None
    ) -> Dict:
        """
        Send update about appeal status
        """
        if status == 'RECOVERED' and recovered_amount:
            message = f"""
✅ *Appeal Successful*

Appeal ID: {appeal_id}
Status: Recovered
Amount Recovered: SAR {recovered_amount:,.2f}

Congratulations! The appeal was successful.

--
BrainSAIT RCM System
            """.strip()
        else:
            message = f"""
📋 *Appeal Status Update*

Appeal ID: {appeal_id}
Status: {status}

Check the system for more details.

--
BrainSAIT RCM System
            """.strip()

        return await self.send_message(to_number, message)

    async def send_monthly_report_notification(
        self,
        to_number: str,
        month: str,
        total_claims: int,
        rejection_rate: float,
        recovery_rate: float,
        report_url: str
    ) -> Dict:
        """
        Send notification about monthly report availability
        """
        message = f"""
📊 *Monthly Report Ready*

Report Period: {month}

📈 Summary:
• Total Claims: {total_claims}
• Rejection Rate: {rejection_rate:.1f}%
• Recovery Rate: {recovery_rate:.1f}%

Download Report: {report_url}

--
BrainSAIT RCM System
        """.strip()

        return await self.send_message(to_number, message)

    async def send_fraud_alert(
        self,
        to_number: str,
        alert_type: str,
        severity: str,
        physician_id: str,
        description: str
    ) -> Dict:
        """
        Send fraud detection alert
        """
        severity_emoji = {
            'LOW': '🟡',
            'MEDIUM': '🟠',
            'HIGH': '🔴',
            'CRITICAL': '🚨'
        }

        message = f"""
{severity_emoji.get(severity, '⚠️')} *Fraud Alert*

Type: {alert_type}
Severity: {severity}
Physician ID: {physician_id}

{description}

Immediate review required.

View Details: https://rcm.brainsait.com/fraud-alerts

--
BrainSAIT Security System
        """.strip()

        return await self.send_message(to_number, message)

    async def send_training_reminder(
        self,
        to_number: str,
        physician_name: str,
        training_topic: str,
        scheduled_date: str
    ) -> Dict:
        """
        Send training session reminder
        """
        message = f"""
📚 *Training Session Reminder*

Physician: {physician_name}
Topic: {training_topic}
Date: {scheduled_date}

Please confirm your attendance.

--
BrainSAIT Training Department
        """.strip()

        return await self.send_message(to_number, message)

    async def send_message(self, to_number: str, message: str) -> Dict:
        """
        Send WhatsApp message using Twilio API
        """
        if not self.client:
            logger.error("WhatsApp client not initialized")
            return {
                'success': False,
                'error': 'WhatsApp service not configured'
            }

        try:
            # Ensure number has whatsapp: prefix
            to_number = to_number.strip()
            if not to_number:
                return {
                    'success': False,
                    'error': 'Recipient number is required'
                }

            message = message.strip()

            if not message:
                return {
                    'success': False,
                    'error': 'Message body is empty'
                }

            if not to_number.startswith('whatsapp:'):
                to_number = f'whatsapp:{to_number}'

            message_obj = await asyncio.to_thread(
                self.client.messages.create,
                from_=self.from_number,
                body=message,
                to=to_number
            )

            logger.info(f"WhatsApp message sent: {message_obj.sid}")

            return {
                'success': True,
                'message_sid': message_obj.sid,
                'status': message_obj.status,
                'sent_at': datetime.now(timezone.utc).isoformat()
            }

        except Exception as e:
            logger.error(f"Failed to send WhatsApp message: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    async def send_bulk_notifications(
        self,
        recipients: List[str],
        message: str
    ) -> Dict:
        """
        Send same message to multiple recipients
        """
        results = []

        for recipient in recipients:
            result = await self.send_message(recipient, message)
            results.append({
                'recipient': recipient,
                **result
            })

        successful = len([r for r in results if r['success']])
        failed = len(results) - successful

        return {
            'total': len(recipients),
            'successful': successful,
            'failed': failed,
            'results': results
        }

    async def send_interactive_message(
        self,
        to_number: str,
        header: str,
        body: str,
        buttons: List[Dict[str, str]]
    ) -> Dict:
        """
        Send interactive message with buttons (requires WhatsApp Business API approval)
        """
        # Note: This requires approved WhatsApp Business API account
        # and message templates

        logger.warning("Interactive messages require approved WhatsApp Business account")

        # Fallback to regular message
        message = f"*{header}*\n\n{body}"
        return await self.send_message(to_number, message)


# Notification templates in Arabic and English
TEMPLATES = {
    'compliance_alert': {
        'ar': """
🚨 *تنبيه امتثال BrainSAIT*

⚠️ *كشف مرفوضات متأخر*

شركة التأمين: {insurance_company}
أيام التأخير: {days_overdue} يوم
المبلغ الإجمالي: {total_amount} ريال

مطلوب إجراء فوري لتجنب افتراض الدفع التلقائي.

--
BrainSAIT Healthcare Solutions
        """,
        'en': """
🚨 *BrainSAIT Compliance Alert*

⚠️ *Overdue Rejection Statement*

Insurance Company: {insurance_company}
Days Overdue: {days_overdue} days
Total Amount: SAR {total_amount}

Action required: Follow up immediately to avoid automatic payment assumption.

--
BrainSAIT Healthcare Solutions
        """
    },
    'rejection_notification': {
        'ar': """
{emoji} *مرفوضات جديدة مستلمة*

عدد المرفوضات: {rejection_count}
المبلغ الإجمالي: {total_amount} ريال
نسبة المرفوضات: {rejection_rate}%

يرجى المراجعة واتخاذ الإجراء المناسب.

عرض التفاصيل: https://rcm.brainsait.com/rejections

--
نظام BrainSAIT RCM
        """,
        'en': """
{emoji} *New Rejections Received*

Total Rejections: {rejection_count}
Total Amount: SAR {total_amount}
Rejection Rate: {rejection_rate}%

Please review and take appropriate action.

View details: https://rcm.brainsait.com/rejections

--
BrainSAIT RCM System
        """
    }
}


async def send_notification(notification_type: str, locale: str, **kwargs) -> Dict:
    """
    Convenience function to send templated notifications
    """
    service = WhatsAppNotificationService()

    if notification_type not in TEMPLATES:
        return {'success': False, 'error': 'Unknown notification type'}

    template = TEMPLATES[notification_type].get(locale, TEMPLATES[notification_type]['en'])
    message = template.format(**kwargs)

    return await service.send_message(kwargs.get('to_number'), message)
