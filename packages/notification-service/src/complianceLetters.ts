import { differenceInDays, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { BilingualText, AuditEntry } from '@brainsait/rejection-tracker';

/**
 * BRAINSAIT: Automated compliance letter generation
 * BILINGUAL: Arabic/English templates
 */

export interface ComplianceLetter {
  type: 'INITIAL_NOTIFICATION' | 'WARNING_FINAL' | 'INFORMATION_REQUEST';
  recipient: string;
  subject: BilingualText;
  body: BilingualText;
  dueDate?: Date;
  daysOverdue?: number;
  totalAmount?: number;
  claimReferences: string[];
  auditLog: AuditEntry[];
}

export class ComplianceLetterService {
  /**
   * Generate initial notification letter (at claim submission)
   * MEDICAL: Include NPHIES reference numbers
   */
  async generateInitialNotification(
    insuranceCompany: string,
    claimSubmissionDate: Date,
    claimIds: string[]
  ): Promise<ComplianceLetter> {
    const dueDate = new Date(claimSubmissionDate);
    dueDate.setDate(dueDate.getDate() + 30);

    return {
      type: 'INITIAL_NOTIFICATION',
      recipient: insuranceCompany,
      subject: {
        ar: 'تنويه: موعد استحقاق كشف المرفوضات',
        en: 'Notice: Rejection Statement Due Date'
      },
      body: {
        ar: `
السادة/ ${insuranceCompany}
تحية طيبة وبعد،

نود إعلامكم بأنه تم رفع المطالبات التالية بتاريخ ${format(claimSubmissionDate, 'dd/MM/yyyy', { locale: ar })}:
عدد المطالبات: ${claimIds.length}
الأرقام المرجعية: ${claimIds.join(', ')}

وفقاً للوائح نظام نفيس (NPHIES)، يُرجى إرسال كشف المرفوضات خلال 30 يوم من تاريخ رفع المطالبات، أي في موعد أقصاه ${format(dueDate, 'dd/MM/yyyy', { locale: ar })}.

في حالة عدم استلام الكشف خلال المدة المحددة، سيتم اعتبار المطالبات مدفوعة بنسبة 100% وفقاً للأنظمة واللوائح المعمول بها.

مع فائق التقدير والاحترام،
قسم المطالبات الطبية - BrainSAIT
        `,
        en: `
Dear ${insuranceCompany},

We would like to inform you that the following claims were submitted on ${format(claimSubmissionDate, 'dd/MM/yyyy')}:
Number of Claims: ${claimIds.length}
Reference Numbers: ${claimIds.join(', ')}

According to NPHIES regulations, please submit the rejection statement within 30 days from the claim submission date, no later than ${format(dueDate, 'dd/MM/yyyy')}.

Failure to provide the statement within the specified period will result in claims being considered 100% paid according to applicable regulations.

Best Regards,
Medical Claims Department - BrainSAIT
        `
      },
      dueDate,
      claimReferences: claimIds,
      auditLog: []
    };
  }

  /**
   * Generate warning letter (after 30-day deadline)
   * COMPLIANCE: Trigger automatic payment assumption
   */
  async generateWarningLetter(
    insuranceCompany: string,
    claimSubmissionDate: Date,
    claimIds: string[],
    totalAmount: number
  ): Promise<ComplianceLetter> {
    const daysOverdue = differenceInDays(new Date(), claimSubmissionDate) - 30;

    return {
      type: 'WARNING_FINAL',
      recipient: insuranceCompany,
      subject: {
        ar: 'إنذار نهائي: تجاوز الموعد المحدد لكشف المرفوضات',
        en: 'Final Warning: Rejection Statement Deadline Exceeded'
      },
      body: {
        ar: `
السادة/ ${insuranceCompany}
تحية طيبة وبعد،

نشير إلى مطالباتنا المرفوعة بتاريخ ${format(claimSubmissionDate, 'dd/MM/yyyy', { locale: ar })} والتي لم يتم استلام كشف المرفوضات الخاص بها حتى تاريخه.

⚠️ تفاصيل التأخير:
• تاريخ الرفع: ${format(claimSubmissionDate, 'dd/MM/yyyy', { locale: ar })}
• الموعد المستحق: ${format(new Date(claimSubmissionDate.getTime() + 30 * 24 * 60 * 60 * 1000), 'dd/MM/yyyy', { locale: ar })}
• عدد أيام التأخير: ${daysOverdue} يوم
• عدد المطالبات: ${claimIds.length}
• المبلغ الإجمالي: ${totalAmount.toLocaleString('ar-SA')} ريال

🔴 إجراء إلزامي:
وفقاً للوائح NPHIES والعقد المبرم بيننا، تُعتبر جميع المطالبات المذكورة أعلاه مدفوعة بنسبة 100% اعتباراً من تاريخ هذه المخاطبة.

يُرجى تحويل المبلغ المستحق خلال 7 أيام عمل.

مع التحية،
الإدارة المالية - قسم المطالبات
BrainSAIT Healthcare Solutions
        `,
        en: `
Dear ${insuranceCompany},

We refer to our claims submitted on ${format(claimSubmissionDate, 'dd/MM/yyyy')}, for which no rejection statement has been received to date.

⚠️ Delay Details:
• Submission Date: ${format(claimSubmissionDate, 'dd/MM/yyyy')}
• Due Date: ${format(new Date(claimSubmissionDate.getTime() + 30 * 24 * 60 * 60 * 1000), 'dd/MM/yyyy')}
• Days Overdue: ${daysOverdue} days
• Number of Claims: ${claimIds.length}
• Total Amount: SAR ${totalAmount.toLocaleString('en-US')}

🔴 Mandatory Action:
According to NPHIES regulations and our contract, all aforementioned claims are considered 100% paid as of this correspondence date.

Please transfer the due amount within 7 business days.

Best Regards,
Financial Management - Claims Department
BrainSAIT Healthcare Solutions
        `
      },
      daysOverdue,
      totalAmount,
      claimReferences: claimIds,
      auditLog: []
    };
  }

  /**
   * Generate information request template
   * BILINGUAL: Request rejection process details
   */
  async generateProcessInquiry(
    insuranceCompany: string
  ): Promise<ComplianceLetter> {
    return {
      type: 'INFORMATION_REQUEST',
      recipient: insuranceCompany,
      subject: {
        ar: 'استعلام رسمي: آلية استقبال واستئناف المرفوضات',
        en: 'Official Inquiry: Rejection Reception and Appeal Process'
      },
      body: {
        ar: `
السادة/ ${insuranceCompany}
تحية طيبة وبعد،

في إطار تحسين التنسيق بين الطرفين وتسريع إجراءات معالجة المطالبات، نرجو التكرم بتزويدنا بالمعلومات التالية:

1️⃣ آلية استقبال كشف المرفوضات:
   ☐ عبر نظام نفيس (NPHIES)
   ☐ عبر البوابة الإلكترونية (يُرجى إرفاق رابط الدخول)
   ☐ عبر البريد الإلكتروني (يُرجى تحديد العنوان)

2️⃣ آلية استئناف المرفوضات:
   ☐ عبر نظام نفيس (NPHIES)
   ☐ عبر البوابة الإلكترونية
   ☐ عبر البريد الإلكتروني

3️⃣ بيانات الاتصال الخاصة بالمرفوضات:
   - البريد الإلكتروني الرسمي: _________________
   - بريد إلكتروني بديل: _________________
   - رقم الهاتف المباشر: _________________
   - اسم المسؤول: _________________
   - المسمى الوظيفي: _________________

4️⃣ المدة الزمنية لمعالجة الاستئنافات: _____ يوم عمل

5️⃣ المستندات المطلوبة للاستئناف:
   ☐ التقارير الطبية
   ☐ نتائج الأشعة والتحاليل
   ☐ موافقات مسبقة (إن وجدت)
   ☐ أخرى (يُرجى التحديد): _________________

نأمل استلام ردكم خلال 7 أيام عمل لتوثيق الإجراءات وضمان الامتثال الكامل للوائح.

مع خالص الشكر والتقدير،
قسم المطالبات الطبية - BrainSAIT
تاريخ الإرسال: ${format(new Date(), 'dd/MM/yyyy', { locale: ar })}
        `,
        en: `
Dear ${insuranceCompany},

To improve coordination and expedite claims processing, please provide the following information:

1️⃣ Rejection Statement Reception Method:
   ☐ Via NPHIES System
   ☐ Via Electronic Portal (please provide login URL)
   ☐ Via Email (please specify address)

2️⃣ Rejection Appeal Process:
   ☐ Via NPHIES System
   ☐ Via Electronic Portal
   ☐ Via Email

3️⃣ Rejection-Related Contact Information:
   - Official Email: _________________
   - Alternative Email: _________________
   - Direct Phone: _________________
   - Contact Person: _________________
   - Job Title: _________________

4️⃣ Appeal Processing Time: _____ business days

5️⃣ Required Documents for Appeals:
   ☐ Medical Reports
   ☐ Radiology & Lab Results
   ☐ Prior Authorizations (if any)
   ☐ Other (please specify): _________________

We hope to receive your response within 7 business days for documentation and full compliance.

Best Regards,
Medical Claims Department - BrainSAIT
Sent: ${format(new Date(), 'dd/MM/yyyy')}
        `
      },
      claimReferences: [],
      auditLog: []
    };
  }
}