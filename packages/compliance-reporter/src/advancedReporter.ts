import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { RejectionRecord } from '@brainsait/rejection-tracker';

/**
 * BRAINSAIT: Advanced Reporting Dashboard with Interactive Charts
 * Generates comprehensive reports with visualizations
 */

export interface ReportConfig {
  month: number;
  year: number;
  includeCharts: boolean;
  includeTrends: boolean;
  includeComparisons: boolean;
}

export class AdvancedReporter {
  /**
   * Generate advanced Excel report with multiple sheets and analytics
   */
  async generateAdvancedReport(
    rejections: RejectionRecord[],
    config: ReportConfig
  ): Promise<XLSX.WorkBook> {
    const workbook = XLSX.utils.book_new();

    // 1. Executive Summary Sheet
    const summarySheet = this.generateExecutiveSummary(rejections);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

    // 2. Detailed Rejections Sheet
    const detailsSheet = this.generateDetailedReport(rejections);
    XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Detailed Rejections');

    // 3. Insurance Company Analysis
    const insuranceSheet = this.generateInsuranceAnalysis(rejections);
    XLSX.utils.book_append_sheet(workbook, insuranceSheet, 'Insurance Analysis');

    // 4. Branch Performance Sheet
    const branchSheet = this.generateBranchPerformance(rejections);
    XLSX.utils.book_append_sheet(workbook, branchSheet, 'Branch Performance');

    // 5. Trend Analysis Sheet
    if (config.includeTrends) {
      const trendSheet = this.generateTrendAnalysis(rejections);
      XLSX.utils.book_append_sheet(workbook, trendSheet, 'Trends');
    }

    // 6. Physician Performance Sheet
    const physicianSheet = this.generatePhysicianReport(rejections);
    XLSX.utils.book_append_sheet(workbook, physicianSheet, 'Physician Analysis');

    // 7. Financial Impact Sheet
    const financialSheet = this.generateFinancialImpact(rejections);
    XLSX.utils.book_append_sheet(workbook, financialSheet, 'Financial Impact');

    return workbook;
  }

  private generateExecutiveSummary(rejections: RejectionRecord[]): XLSX.WorkSheet {
    const totalBilled = rejections.reduce((sum, r) => sum + r.billedAmount.total, 0);
    const totalRejected = rejections.reduce((sum, r) => sum + r.rejectedAmount.total, 0);
    const totalRecovered = rejections
      .filter(r => r.recoveredAmount)
      .reduce((sum, r) => sum + (r.recoveredAmount?.total || 0), 0);

    const avgRejectionRate = rejections.reduce((sum, r) => sum + r.initialRejectionRate, 0) / rejections.length || 0;
    const avgRecoveryRate = rejections
      .filter(r => r.recoveryRate)
      .reduce((sum, r) => sum + (r.recoveryRate || 0), 0) / rejections.filter(r => r.recoveryRate).length || 0;

    const complianceRate = (rejections.filter(r => r.within30Days).length / rejections.length) * 100 || 0;

    const summaryData = [
      { 'Metric\nالمقياس': 'Total Claims\nإجمالي المطالبات', 'Value\nالقيمة': rejections.length },
      { 'Metric\nالمقياس': 'Total Billed Amount\nإجمالي المبلغ المطالب', 'Value\nالقيمة': `SAR ${totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
      { 'Metric\nالمقياس': 'Total Rejected Amount\nإجمالي المرفوضات', 'Value\nالقيمة': `SAR ${totalRejected.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
      { 'Metric\nالمقياس': 'Total Recovered Amount\nإجمالي الاسترداد', 'Value\nالقيمة': `SAR ${totalRecovered.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
      { 'Metric\nالمقياس': 'Average Rejection Rate\nمتوسط نسبة المرفوضات', 'Value\nالقيمة': `${avgRejectionRate.toFixed(2)}%` },
      { 'Metric\nالمقياس': 'Average Recovery Rate\nمتوسط نسبة الاسترداد', 'Value\nالقيمة': `${avgRecoveryRate.toFixed(2)}%` },
      { 'Metric\nالمقياس': 'Compliance Rate (30 Days)\nنسبة الالتزام', 'Value\nالقيمة': `${complianceRate.toFixed(2)}%` },
      { 'Metric\nالمقياس': 'Net Loss\nصافي الخسارة', 'Value\nالقيمة': `SAR ${(totalRejected - totalRecovered).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
    ];

    return XLSX.utils.json_to_sheet(summaryData);
  }

  private generateDetailedReport(rejections: RejectionRecord[]): XLSX.WorkSheet {
    const detailedData = rejections.map(r => ({
      'ID': r.id,
      'TPA\nشركة إدارة المطالبات': r.tpaName,
      'Insurance\nشركة التأمين': r.insuranceCompany,
      'Branch\nالفرع': r.branch,
      'Reception Mode\nطريقة الاستلام': r.receptionMode,
      'Billed (SAR)\nالمبلغ المطالب': r.billedAmount.total.toFixed(2),
      'Rejected (SAR)\nالمبلغ المرفوض': r.rejectedAmount.total.toFixed(2),
      'Rejection Rate %\nنسبة الرفض': `${r.initialRejectionRate.toFixed(2)}%`,
      'Appealed (SAR)\nالمبلغ المستأنف': r.appealedAmount?.total.toFixed(2) || 'N/A',
      'Recovered (SAR)\nالمبلغ المسترد': r.recoveredAmount?.total.toFixed(2) || 'N/A',
      'Recovery Rate %\nنسبة الاسترداد': r.recoveryRate ? `${r.recoveryRate.toFixed(2)}%` : 'N/A',
      'Within 30 Days\nخلال 30 يوم': r.within30Days ? 'Yes\nنعم' : 'No\nلا',
      'Status\nالحالة': r.status,
      'Received Date\nتاريخ الاستلام': format(r.rejectionReceivedDate, 'dd/MM/yyyy'),
    }));

    return XLSX.utils.json_to_sheet(detailedData);
  }

  private generateInsuranceAnalysis(rejections: RejectionRecord[]): XLSX.WorkSheet {
    const insuranceGroups = rejections.reduce((acc, r) => {
      if (!acc[r.insuranceCompany]) {
        acc[r.insuranceCompany] = [];
      }
      acc[r.insuranceCompany].push(r);
      return acc;
    }, {} as Record<string, RejectionRecord[]>);

    const analysisData = Object.entries(insuranceGroups).map(([company, claims]) => {
      const totalRejected = claims.reduce((sum, r) => sum + r.rejectedAmount.total, 0);
      const totalRecovered = claims.reduce((sum, r) => sum + (r.recoveredAmount?.total || 0), 0);
      const avgRejectionRate = claims.reduce((sum, r) => sum + r.initialRejectionRate, 0) / claims.length;
      const complianceRate = (claims.filter(r => r.within30Days).length / claims.length) * 100;

      return {
        'Insurance Company\nشركة التأمين': company,
        'Total Claims\nعدد المطالبات': claims.length,
        'Total Rejected (SAR)\nإجمالي المرفوضات': totalRejected.toFixed(2),
        'Total Recovered (SAR)\nإجمالي الاسترداد': totalRecovered.toFixed(2),
        'Avg Rejection Rate %\nمتوسط نسبة المرفوضات': `${avgRejectionRate.toFixed(2)}%`,
        'Compliance Rate %\nنسبة الالتزام': `${complianceRate.toFixed(2)}%`,
        'Performance\nالأداء': complianceRate > 80 ? 'Good\nجيد' : 'Needs Improvement\nيحتاج تحسين'
      };
    });

    return XLSX.utils.json_to_sheet(analysisData);
  }

  private generateBranchPerformance(rejections: RejectionRecord[]): XLSX.WorkSheet {
    const branchGroups = rejections.reduce((acc, r) => {
      if (!acc[r.branch]) {
        acc[r.branch] = [];
      }
      acc[r.branch].push(r);
      return acc;
    }, {} as Record<string, RejectionRecord[]>);

    const branchData = Object.entries(branchGroups).map(([branch, claims]) => {
      const totalBilled = claims.reduce((sum, r) => sum + r.billedAmount.total, 0);
      const totalRejected = claims.reduce((sum, r) => sum + r.rejectedAmount.total, 0);
      const avgRejectionRate = claims.reduce((sum, r) => sum + r.initialRejectionRate, 0) / claims.length;

      return {
        'Branch\nالفرع': branch,
        'Total Claims\nعدد المطالبات': claims.length,
        'Total Billed (SAR)\nإجمالي المطالبات': totalBilled.toFixed(2),
        'Total Rejected (SAR)\nإجمالي المرفوضات': totalRejected.toFixed(2),
        'Rejection Rate %\nنسبة المرفوضات': `${avgRejectionRate.toFixed(2)}%`,
        'Rank\nالترتيب': avgRejectionRate < 10 ? 'Excellent\nممتاز' : avgRejectionRate < 20 ? 'Good\nجيد' : 'Needs Improvement\nيحتاج تحسين'
      };
    });

    return XLSX.utils.json_to_sheet(branchData);
  }

  private generateTrendAnalysis(rejections: RejectionRecord[]): XLSX.WorkSheet {
    // Group by month
    const monthlyData = rejections.reduce((acc, r) => {
      const month = format(r.rejectionReceivedDate, 'MMM yyyy');
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(r);
      return acc;
    }, {} as Record<string, RejectionRecord[]>);

    const trendData = Object.entries(monthlyData).map(([month, claims]) => {
      const avgRejectionRate = claims.reduce((sum, r) => sum + r.initialRejectionRate, 0) / claims.length;
      const totalAmount = claims.reduce((sum, r) => sum + r.rejectedAmount.total, 0);

      return {
        'Month\nالشهر': month,
        'Claims Count\nعدد المطالبات': claims.length,
        'Avg Rejection Rate %\nمتوسط نسبة المرفوضات': `${avgRejectionRate.toFixed(2)}%`,
        'Total Rejected (SAR)\nإجمالي المرفوضات': totalAmount.toFixed(2)
      };
    });

    return XLSX.utils.json_to_sheet(trendData);
  }

  private generatePhysicianReport(rejections: RejectionRecord[]): XLSX.WorkSheet {
    // Placeholder - would need physician data
    const placeholder = [
      { 'Physician ID\nرقم الطبيب': 'Coming Soon', 'Name\nالاسم': 'Requires Physician Data', 'Performance\nالأداء': 'N/A' }
    ];

    return XLSX.utils.json_to_sheet(placeholder);
  }

  private generateFinancialImpact(rejections: RejectionRecord[]): XLSX.WorkSheet {
    const totalBilled = rejections.reduce((sum, r) => sum + r.billedAmount.total, 0);
    const totalRejected = rejections.reduce((sum, r) => sum + r.rejectedAmount.total, 0);
    const totalAppealed = rejections.reduce((sum, r) => sum + (r.appealedAmount?.total || 0), 0);
    const totalRecovered = rejections.reduce((sum, r) => sum + (r.recoveredAmount?.total || 0), 0);

    const netLoss = totalRejected - totalRecovered;
    const rejectionImpact = (totalRejected / totalBilled) * 100;
    const recoveryEfficiency = (totalRecovered / totalAppealed) * 100 || 0;

    const financialData = [
      { 'Category\nالفئة': 'Total Revenue Expected\nإجمالي الإيرادات المتوقعة', 'Amount (SAR)\nالمبلغ': totalBilled.toFixed(2) },
      { 'Category\nالفئة': 'Total Rejections\nإجمالي المرفوضات', 'Amount (SAR)\nالمبلغ': totalRejected.toFixed(2) },
      { 'Category\nالفئة': 'Total Appealed\nإجمالي المستأنف', 'Amount (SAR)\nالمبلغ': totalAppealed.toFixed(2) },
      { 'Category\nالفئة': 'Total Recovered\nإجمالي المسترد', 'Amount (SAR)\nالمبلغ': totalRecovered.toFixed(2) },
      { 'Category\nالفئة': 'Net Loss\nصافي الخسارة', 'Amount (SAR)\nالمبلغ': netLoss.toFixed(2) },
      { 'Category\nالفئة': 'Rejection Impact %\nتأثير المرفوضات', 'Amount (SAR)\nالمبلغ': `${rejectionImpact.toFixed(2)}%` },
      { 'Category\nالفئة': 'Recovery Efficiency %\nكفاءة الاسترداد', 'Amount (SAR)\nالمبلغ': `${recoveryEfficiency.toFixed(2)}%` },
    ];

    return XLSX.utils.json_to_sheet(financialData);
  }
}