/**
 * BrainSAIT Teams Integration - Adaptive Card Builder
 * Utilities for building Teams adaptive cards with template binding
 */

import * as ACData from 'adaptivecards-templating';
import complianceLetterTemplate from './complianceLetterCard.json';
import rejectionSummaryTemplate from './rejectionSummaryCard.json';

export interface ComplianceLetterData {
  title: string;
  subtitle: string;
  insuranceCompany: string;
  claimId: string;
  amount: string;
  rejectionDate: string;
  deadline: string;
  message: string;
  statusMessage: string;
  severity: 'default' | 'emphasis' | 'good' | 'attention' | 'warning' | 'accent';
  detailsUrl: string;
  appealUrl: string;
}

export interface RejectionSummaryData {
  period: string;
  totalClaims: string;
  rejectionRate: string;
  rejectionRateColor: 'default' | 'dark' | 'light' | 'accent' | 'good' | 'warning' | 'attention';
  totalAmount: string;
  recoveryRate: string;
  topReasons: Array<{ title: string; value: string }>;
  pendingLetters: string;
  dashboardUrl: string;
  reportUrl: string;
}

export class AdaptiveCardBuilder {
  /**
   * Build a compliance letter adaptive card
   */
  static buildComplianceLetter(data: ComplianceLetterData): unknown {
    const template = new ACData.Template(complianceLetterTemplate);
    const context = new ACData.EvaluationContext();
    context.$root = data;
    
    return template.expand(context);
  }

  /**
   * Build a rejection summary adaptive card
   */
  static buildRejectionSummary(data: RejectionSummaryData): unknown {
    const template = new ACData.Template(rejectionSummaryTemplate);
    const context = new ACData.EvaluationContext();
    context.$root = data;
    
    return template.expand(context);
  }

  /**
   * Build a bilingual compliance letter with default formatting
   */
  static buildBilingualComplianceLetter(options: {
    titleEn: string;
    titleAr: string;
    insuranceCompany: string;
    claimId: string;
    amountSAR: number;
    rejectionDate: Date;
    deadlineDays: number;
    messageEn: string;
    messageAr: string;
    isWarning: boolean;
    baseUrl: string;
  }): unknown {
    const deadline = new Date(options.rejectionDate);
    deadline.setDate(deadline.getDate() + options.deadlineDays);

    const data: ComplianceLetterData = {
      title: `${options.titleEn} | ${options.titleAr}`,
      subtitle: 'BrainSAIT Healthcare Claims Management',
      insuranceCompany: options.insuranceCompany,
      claimId: options.claimId,
      amount: `${options.amountSAR.toLocaleString('en-US')} SAR | ${options.amountSAR.toLocaleString('ar-SA')} ريال`,
      rejectionDate: options.rejectionDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      deadline: deadline.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      message: `${options.messageEn}\n\n${options.messageAr}`,
      statusMessage: options.isWarning 
        ? '⚠️ URGENT: Action required within 30 days | عاجل: مطلوب إجراء خلال 30 يومًا'
        : 'ℹ️ Information: Please review | معلومات: يرجى المراجعة',
      severity: options.isWarning ? 'warning' : 'emphasis',
      detailsUrl: `${options.baseUrl}/claims/${options.claimId}`,
      appealUrl: `${options.baseUrl}/appeals/new?claimId=${options.claimId}`,
    };

    return this.buildComplianceLetter(data);
  }

  /**
   * Build a monthly rejection summary
   */
  static buildMonthlyRejectionSummary(options: {
    month: string;
    year: number;
    totalClaims: number;
    rejectionRate: number;
    totalAmountSAR: number;
    recoveryRate: number;
    topReasons: Array<{ reasonEn: string; reasonAr: string; count: number }>;
    pendingLetters: number;
    baseUrl: string;
  }): unknown {
    const data: RejectionSummaryData = {
      period: `${options.month} ${options.year}`,
      totalClaims: options.totalClaims.toLocaleString('en-US'),
      rejectionRate: `${options.rejectionRate.toFixed(1)}%`,
      rejectionRateColor: options.rejectionRate > 15 ? 'attention' : 
                          options.rejectionRate > 10 ? 'warning' : 'good',
      totalAmount: `${options.totalAmountSAR.toLocaleString('en-US')} SAR`,
      recoveryRate: `${options.recoveryRate.toFixed(1)}%`,
      topReasons: options.topReasons.map((reason, index) => ({
        title: `${index + 1}. ${reason.reasonEn} | ${reason.reasonAr}`,
        value: `${reason.count} claims`,
      })),
      pendingLetters: options.pendingLetters.toString(),
      dashboardUrl: `${options.baseUrl}/dashboard`,
      reportUrl: `${options.baseUrl}/reports/monthly/${options.year}/${options.month}`,
    };

    return this.buildRejectionSummary(data);
  }
}
