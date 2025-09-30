import { differenceInDays } from 'date-fns';
import { RejectionRecord, MoneyAmount } from './types';

/**
 * Calculate initial rejection rate
 */
export function calculateInitialRejectionRate(
  billed: MoneyAmount,
  rejected: MoneyAmount
): number {
  if (billed.total === 0) return 0;
  return (rejected.total / billed.total) * 100;
}

/**
 * Calculate appeal rate
 */
export function calculateAppealRate(
  rejected: MoneyAmount,
  appealed: MoneyAmount
): number {
  if (rejected.total === 0) return 0;
  return (appealed.total / rejected.total) * 100;
}

/**
 * Calculate recovery rate
 */
export function calculateRecoveryRate(
  appealed: MoneyAmount,
  recovered: MoneyAmount
): number {
  if (appealed.total === 0) return 0;
  return (recovered.total / appealed.total) * 100;
}

/**
 * Check if rejection response was received within 30 days
 */
export function isWithin30Days(
  submissionDate: Date,
  receivedDate: Date
): boolean {
  const daysDiff = differenceInDays(receivedDate, submissionDate);
  return daysDiff <= 30;
}

/**
 * Calculate days overdue
 */
export function calculateDaysOverdue(
  submissionDate: Date,
  currentDate: Date = new Date()
): number {
  const daysDiff = differenceInDays(currentDate, submissionDate);
  return Math.max(0, daysDiff - 30);
}

/**
 * Calculate average rejection rate from multiple records
 */
export function calculateAvgRejectionRate(rejections: RejectionRecord[]): number {
  if (rejections.length === 0) return 0;
  const sum = rejections.reduce((acc, r) => acc + r.initialRejectionRate, 0);
  return sum / rejections.length;
}

/**
 * Calculate recovery rate from multiple records
 */
export function calculateRecoveryRateFromRecords(rejections: RejectionRecord[]): number {
  const withRecovery = rejections.filter(r => r.recoveryRate !== undefined);
  if (withRecovery.length === 0) return 0;
  const sum = withRecovery.reduce((acc, r) => acc + (r.recoveryRate || 0), 0);
  return sum / withRecovery.length;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, locale: 'ar' | 'en'): string {
  const formatted = amount.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return locale === 'ar' ? `${formatted} ريال` : `SAR ${formatted}`;
}

/**
 * Create money amount object with VAT calculation
 */
export function createMoneyAmount(net: number, vatRate: number = 0.15): MoneyAmount {
  const vat = net * vatRate;
  const total = net + vat;
  return { net, vat, total };
}