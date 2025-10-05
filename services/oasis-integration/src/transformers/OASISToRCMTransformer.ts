/**
 * OASIS to RCM Data Transformer
 * Transforms OASIS+ data format to RCM RejectionRecord format
 */

import { OASISClaim, OASISRejection } from '../types/oasis.types';
import { RCMRejectionRecord } from '../types/rcm.types';
import { BilingualText } from '../types/common.types';
import pino from 'pino';

const logger = pino({ name: 'OASISToRCMTransformer' });

export class OASISToRCMTransformer {
  /**
   * Transform OASIS rejection to RCM rejection record
   */
  transform(oasisRejection: OASISRejection, oasisClaim: OASISClaim): RCMRejectionRecord {
    logger.info({ claimNumber: oasisRejection.claimNumber }, 'Transforming OASIS rejection to RCM format...');

    const now = new Date().toISOString();

    // Calculate timeline metrics
    const submissionDate = new Date(oasisClaim.submissionDate);
    const rejectionDate = new Date(oasisRejection.rejectionDate);
    const daysToRejection = Math.floor((rejectionDate.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate appeal deadline (30 days from rejection)
    const appealDeadline = new Date(rejectionDate);
    appealDeadline.setDate(appealDeadline.getDate() + 30);
    const appealDeadlineStr = appealDeadline.toISOString().split('T')[0];

    const today = new Date();
    const daysUntilDeadline = Math.floor((appealDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const record: RCMRejectionRecord = {
      id: this.generateRCMId(oasisRejection),
      claimNumber: oasisRejection.claimNumber,
      rejectionId: oasisRejection.rejectionId,

      // Patient information
      patientInfo: {
        nationalId: oasisClaim.patientNationalId,
        name: this.createBilingualName(oasisClaim.patientName),
        dateOfBirth: oasisClaim.dateOfBirth,
        gender: oasisClaim.gender,
        membershipNumber: oasisClaim.membershipNumber,
      },

      // Provider information
      providerInfo: {
        providerId: oasisClaim.providerNumber,
        providerName: {
          ar: 'مستشفى برين سايت',
          en: 'BrainSAIT Hospital',
        },
        branch: this.extractBranchFromProvider(oasisClaim.providerNumber),
      },

      // Payer information
      payerInfo: {
        payerCode: oasisRejection.payerCode,
        payerName: this.createBilingualPayerName(oasisRejection.payerName),
        tpaName: oasisRejection.tpaName ? {
          ar: oasisRejection.tpaName,
          en: oasisRejection.tpaName,
        } : undefined,
      },

      // Rejection details
      rejectionDetails: {
        rejectionDate: oasisRejection.rejectionDate,
        rejectionCode: oasisRejection.rejectionCode,
        rejectionReason: this.createBilingualRejectionReason(
          oasisRejection.rejectionCode,
          oasisRejection.rejectionReason
        ),
        rejectionDescription: oasisRejection.rejectionDescription ? {
          ar: oasisRejection.rejectionDescription,
          en: oasisRejection.rejectionDescription,
        } : undefined,
        category: oasisRejection.category,
        rejectionType: oasisRejection.rejectionType,
      },

      // Financial impact
      financialImpact: {
        totalClaimed: {
          net: oasisClaim.netAmount,
          vat: oasisClaim.vatAmount,
          total: oasisClaim.totalAmount,
        },
        totalRejected: oasisRejection.rejectedAmount,
        totalApproved: oasisClaim.approvedAmount ? {
          net: oasisClaim.approvedAmount * 0.87, // Approximate 15% VAT
          vat: oasisClaim.approvedAmount * 0.13,
          total: oasisClaim.approvedAmount,
        } : undefined,
      },

      // Timeline tracking
      timeline: {
        claimSubmissionDate: oasisClaim.submissionDate,
        encounterDate: oasisClaim.encounterDate,
        rejectionReceivedDate: oasisRejection.rejectionDate,
        daysToRejection,
        daysUntilDeadline,
        appealDeadline: appealDeadlineStr,
      },

      // Status tracking
      status: this.mapAppealStatus(oasisRejection.appealStatus, daysUntilDeadline),

      // Appeal information
      appeal: oasisRejection.appealStatus ? {
        appealStatus: this.mapOASISAppealStatus(oasisRejection.appealStatus),
      } : undefined,

      // Service details
      services: this.transformServices(oasisClaim.items),

      // Analysis data
      analysis: {
        preventable: this.isPreventable(oasisRejection.category),
        riskLevel: this.assessRiskLevel(oasisRejection.rejectedAmount.total, oasisRejection.category),
        correctiveActionRequired: this.requiresCorrectiveAction(oasisRejection.category),
      },

      // Metadata
      metadata: {
        sourceSystem: 'OASIS',
        receptionMode: 'PORTAL', // OASIS is portal-based
        importedAt: now,
        importedBy: 'oasis-integration-service',
        lastModifiedAt: now,
        lastModifiedBy: 'oasis-integration-service',
      },
    };

    logger.info({ id: record.id }, 'Transformation complete');
    return record;
  }

  /**
   * Batch transform multiple rejections
   */
  transformBatch(rejections: Array<{ rejection: OASISRejection; claim: OASISClaim }>): RCMRejectionRecord[] {
    logger.info({ count: rejections.length }, 'Transforming batch of rejections...');

    return rejections.map(({ rejection, claim }) => this.transform(rejection, claim));
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  private generateRCMId(rejection: OASISRejection): string {
    // Generate a unique RCM ID
    return `RCM-${rejection.claimNumber}-${Date.now()}`;
  }

  private createBilingualName(name: { first: string; last: string; middle?: string }): BilingualText {
    const fullName = `${name.first} ${name.middle || ''} ${name.last}`.trim();

    // Check if name contains Arabic characters
    const hasArabic = /[\u0600-\u06FF]/.test(fullName);

    return {
      ar: hasArabic ? fullName : 'غير متوفر',
      en: !hasArabic ? fullName : 'N/A',
    };
  }

  private createBilingualPayerName(payerName: string): BilingualText {
    // Map common payer names to bilingual
    const payerMap: Record<string, BilingualText> = {
      'BUPA': { ar: 'بوبا', en: 'BUPA' },
      'Tawuniya': { ar: 'التعاونية', en: 'Tawuniya' },
      'MedGulf': { ar: 'ميدغلف', en: 'MedGulf' },
      'AlRajhi': { ar: 'الراجحي تكافل', en: 'AlRajhi Takaful' },
    };

    return payerMap[payerName] || {
      ar: payerName,
      en: payerName,
    };
  }

  private createBilingualRejectionReason(code: string, reason: string): BilingualText {
    // Map common rejection codes to bilingual reasons
    const reasonMap: Record<string, BilingualText> = {
      'M01': {
        ar: 'خدمة غير مغطاة',
        en: 'Service not covered',
      },
      'M02': {
        ar: 'غير ضروري طبياً',
        en: 'Not medically necessary',
      },
      'T01': {
        ar: 'وثائق ناقصة',
        en: 'Incomplete documentation',
      },
      'A01': {
        ar: 'خطأ في الترميز',
        en: 'Coding error',
      },
      'B01': {
        ar: 'خطأ في الفوترة',
        en: 'Billing error',
      },
      'AUTH01': {
        ar: 'تصريح مسبق مطلوب',
        en: 'Prior authorization required',
      },
    };

    return reasonMap[code] || {
      ar: reason,
      en: reason,
    };
  }

  private extractBranchFromProvider(providerNumber: string): string | undefined {
    // Extract branch from provider number (if encoded)
    // Example: PRV-001-BR-RYD = Riyadh branch
    const parts = providerNumber.split('-');
    if (parts.length >= 4) {
      return parts[3]; // Branch code
    }
    return undefined;
  }

  private mapAppealStatus(
    oasisAppealStatus?: OASISRejection['appealStatus'],
    daysUntilDeadline?: number
  ): RCMRejectionRecord['status'] {
    if (oasisAppealStatus === 'APPEAL_ACCEPTED') {
      return 'RECOVERED';
    }

    if (oasisAppealStatus === 'APPEAL_REJECTED') {
      return 'FINAL_REJECTION';
    }

    if (oasisAppealStatus === 'UNDER_APPEAL') {
      return 'UNDER_APPEAL';
    }

    // Check if deadline passed
    if (daysUntilDeadline !== undefined && daysUntilDeadline < 0) {
      return 'FINAL_REJECTION';
    }

    return 'PENDING_REVIEW';
  }

  private mapOASISAppealStatus(
    status: OASISRejection['appealStatus']
  ): 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | undefined {
    if (!status) return undefined;

    const map: Record<string, any> = {
      'UNDER_APPEAL': 'SUBMITTED',
      'APPEAL_ACCEPTED': 'ACCEPTED',
      'APPEAL_REJECTED': 'REJECTED',
    };

    return map[status];
  }

  private transformServices(items: OASISClaim['items']): RCMRejectionRecord['services'] {
    return items.map(item => ({
      itemNumber: item.itemNumber,
      serviceCode: item.serviceCode,
      serviceDescription: {
        ar: item.serviceDescription,
        en: item.serviceDescription,
      },
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalAmount: {
        net: item.netAmount,
        vat: item.vatAmount,
        total: item.totalAmount,
      },
      status: item.status,
      rejectionCode: item.rejectionCode,
      rejectionReason: item.rejectionReason ? {
        ar: item.rejectionReason,
        en: item.rejectionReason,
      } : undefined,
    }));
  }

  private isPreventable(category: OASISRejection['category']): boolean {
    // Billing, coding, and administrative errors are preventable
    return ['BILLING', 'ADMINISTRATIVE', 'TECHNICAL'].includes(category);
  }

  private assessRiskLevel(
    amount: number,
    category: OASISRejection['category']
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // High-value rejections are higher risk
    if (amount > 50000) return 'CRITICAL';
    if (amount > 20000) return 'HIGH';

    // Medical rejections are higher risk
    if (category === 'MEDICAL') return 'HIGH';

    // Authorization issues are medium risk
    if (category === 'AUTHORIZATION') return 'MEDIUM';

    return 'LOW';
  }

  private requiresCorrectiveAction(category: OASISRejection['category']): boolean {
    // Systematic errors require corrective action
    return ['BILLING', 'ADMINISTRATIVE', 'TECHNICAL'].includes(category);
  }
}
