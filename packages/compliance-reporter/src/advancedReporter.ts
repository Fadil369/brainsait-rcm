import ExcelJS from 'exceljs';
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
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();

    // 1. Executive Summary Sheet
    this.generateExecutiveSummary(workbook, rejections);

    // 2. Detailed Rejections Sheet
    this.generateDetailedReport(workbook, rejections);

    // 3. Insurance Company Analysis
    this.generateInsuranceAnalysis(workbook, rejections);

    // 4. Branch Performance Sheet
    this.generateBranchPerformance(workbook, rejections);

    // 5. Trend Analysis Sheet
    if (config.includeTrends) {
      this.generateTrendAnalysis(workbook, rejections);
    }

    // 6. Physician Performance Sheet
    this.generatePhysicianReport(workbook, rejections);

    // 7. Financial Impact Sheet
    this.generateFinancialImpact(workbook, rejections);

    return workbook;
  }

  private generateExecutiveSummary(workbook: ExcelJS.Workbook, rejections: RejectionRecord[]): void {
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

    const worksheet = workbook.addWorksheet('Executive Summary');

    worksheet.columns = [
      { header: 'Metric\nالمقياس', key: 'metric', width: 40 },
      { header: 'Value\nالقيمة', key: 'value', width: 30 }
    ];

    worksheet.addRows([
      { metric: 'Total Claims\nإجمالي المطالبات', value: rejections.length },
      { metric: 'Total Billed Amount\nإجمالي المبلغ المطالب', value: `SAR ${totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
      { metric: 'Total Rejected Amount\nإجمالي المرفوضات', value: `SAR ${totalRejected.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
      { metric: 'Total Recovered Amount\nإجمالي الاسترداد', value: `SAR ${totalRecovered.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
      { metric: 'Average Rejection Rate\nمتوسط نسبة المرفوضات', value: `${avgRejectionRate.toFixed(2)}%` },
      { metric: 'Average Recovery Rate\nمتوسط نسبة الاسترداد', value: `${avgRecoveryRate.toFixed(2)}%` },
      { metric: 'Compliance Rate (30 Days)\nنسبة الالتزام', value: `${complianceRate.toFixed(2)}%` },
      { metric: 'Net Loss\nصافي الخسارة', value: `SAR ${(totalRejected - totalRecovered).toLocaleString('en-US', { minimumFractionDigits: 2 })}` }
    ]);
  }

  private generateDetailedReport(workbook: ExcelJS.Workbook, rejections: RejectionRecord[]): void {
    const worksheet = workbook.addWorksheet('Detailed Rejections');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 15 },
      { header: 'TPA\nشركة إدارة المطالبات', key: 'tpa', width: 25 },
      { header: 'Insurance\nشركة التأمين', key: 'insurance', width: 25 },
      { header: 'Branch\nالفرع', key: 'branch', width: 20 },
      { header: 'Reception Mode\nطريقة الاستلام', key: 'receptionMode', width: 15 },
      { header: 'Billed (SAR)\nالمبلغ المطالب', key: 'billed', width: 15 },
      { header: 'Rejected (SAR)\nالمبلغ المرفوض', key: 'rejected', width: 15 },
      { header: 'Rejection Rate %\nنسبة الرفض', key: 'rejectionRate', width: 15 },
      { header: 'Appealed (SAR)\nالمبلغ المستأنف', key: 'appealed', width: 15 },
      { header: 'Recovered (SAR)\nالمبلغ المسترد', key: 'recovered', width: 15 },
      { header: 'Recovery Rate %\nنسبة الاسترداد', key: 'recoveryRate', width: 15 },
      { header: 'Within 30 Days\nخلال 30 يوم', key: 'within30Days', width: 15 },
      { header: 'Status\nالحالة', key: 'status', width: 20 },
      { header: 'Received Date\nتاريخ الاستلام', key: 'receivedDate', width: 15 }
    ];

    const rows = rejections.map(r => ({
      id: r.id,
      tpa: r.tpaName,
      insurance: r.insuranceCompany,
      branch: r.branch,
      receptionMode: r.receptionMode,
      billed: r.billedAmount.total.toFixed(2),
      rejected: r.rejectedAmount.total.toFixed(2),
      rejectionRate: `${r.initialRejectionRate.toFixed(2)}%`,
      appealed: r.appealedAmount?.total.toFixed(2) || 'N/A',
      recovered: r.recoveredAmount?.total.toFixed(2) || 'N/A',
      recoveryRate: r.recoveryRate ? `${r.recoveryRate.toFixed(2)}%` : 'N/A',
      within30Days: r.within30Days ? 'Yes\nنعم' : 'No\nلا',
      status: r.status,
      receivedDate: format(r.rejectionReceivedDate, 'dd/MM/yyyy')
    }));

    worksheet.addRows(rows);
  }

  private generateInsuranceAnalysis(workbook: ExcelJS.Workbook, rejections: RejectionRecord[]): void {
    const insuranceGroups = rejections.reduce((acc, r) => {
      if (!acc[r.insuranceCompany]) {
        acc[r.insuranceCompany] = [];
      }
      acc[r.insuranceCompany].push(r);
      return acc;
    }, {} as Record<string, RejectionRecord[]>);

    const worksheet = workbook.addWorksheet('Insurance Analysis');

    worksheet.columns = [
      { header: 'Insurance Company\nشركة التأمين', key: 'company', width: 30 },
      { header: 'Total Claims\nعدد المطالبات', key: 'totalClaims', width: 15 },
      { header: 'Total Rejected (SAR)\nإجمالي المرفوضات', key: 'totalRejected', width: 20 },
      { header: 'Total Recovered (SAR)\nإجمالي الاسترداد', key: 'totalRecovered', width: 20 },
      { header: 'Avg Rejection Rate %\nمتوسط نسبة المرفوضات', key: 'avgRejectionRate', width: 20 },
      { header: 'Compliance Rate %\nنسبة الالتزام', key: 'complianceRate', width: 15 },
      { header: 'Performance\nالأداء', key: 'performance', width: 20 }
    ];

    const rows = Object.entries(insuranceGroups).map(([company, claims]) => {
      const totalRejected = claims.reduce((sum, r) => sum + r.rejectedAmount.total, 0);
      const totalRecovered = claims.reduce((sum, r) => sum + (r.recoveredAmount?.total || 0), 0);
      const avgRejectionRate = claims.reduce((sum, r) => sum + r.initialRejectionRate, 0) / claims.length;
      const complianceRate = (claims.filter(r => r.within30Days).length / claims.length) * 100;

      return {
        company,
        totalClaims: claims.length,
        totalRejected: totalRejected.toFixed(2),
        totalRecovered: totalRecovered.toFixed(2),
        avgRejectionRate: `${avgRejectionRate.toFixed(2)}%`,
        complianceRate: `${complianceRate.toFixed(2)}%`,
        performance: complianceRate > 80 ? 'Good\nجيد' : 'Needs Improvement\nيحتاج تحسين'
      };
    });

    worksheet.addRows(rows);
  }

  private generateBranchPerformance(workbook: ExcelJS.Workbook, rejections: RejectionRecord[]): void {
    const branchGroups = rejections.reduce((acc, r) => {
      if (!acc[r.branch]) {
        acc[r.branch] = [];
      }
      acc[r.branch].push(r);
      return acc;
    }, {} as Record<string, RejectionRecord[]>);

    const worksheet = workbook.addWorksheet('Branch Performance');

    worksheet.columns = [
      { header: 'Branch\nالفرع', key: 'branch', width: 25 },
      { header: 'Total Claims\nعدد المطالبات', key: 'totalClaims', width: 15 },
      { header: 'Total Billed (SAR)\nإجمالي المطالبات', key: 'totalBilled', width: 20 },
      { header: 'Total Rejected (SAR)\nإجمالي المرفوضات', key: 'totalRejected', width: 20 },
      { header: 'Rejection Rate %\nنسبة المرفوضات', key: 'rejectionRate', width: 15 },
      { header: 'Rank\nالترتيب', key: 'rank', width: 20 }
    ];

    const rows = Object.entries(branchGroups).map(([branch, claims]) => {
      const totalBilled = claims.reduce((sum, r) => sum + r.billedAmount.total, 0);
      const totalRejected = claims.reduce((sum, r) => sum + r.rejectedAmount.total, 0);
      const avgRejectionRate = claims.reduce((sum, r) => sum + r.initialRejectionRate, 0) / claims.length;

      return {
        branch,
        totalClaims: claims.length,
        totalBilled: totalBilled.toFixed(2),
        totalRejected: totalRejected.toFixed(2),
        rejectionRate: `${avgRejectionRate.toFixed(2)}%`,
        rank: avgRejectionRate < 10 ? 'Excellent\nممتاز' : avgRejectionRate < 20 ? 'Good\nجيد' : 'Needs Improvement\nيحتاج تحسين'
      };
    });

    worksheet.addRows(rows);
  }

  private generateTrendAnalysis(workbook: ExcelJS.Workbook, rejections: RejectionRecord[]): void {
    // Group by month
    const monthlyData = rejections.reduce((acc, r) => {
      const month = format(r.rejectionReceivedDate, 'MMM yyyy');
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(r);
      return acc;
    }, {} as Record<string, RejectionRecord[]>);

    const worksheet = workbook.addWorksheet('Trends');

    worksheet.columns = [
      { header: 'Month\nالشهر', key: 'month', width: 20 },
      { header: 'Claims Count\nعدد المطالبات', key: 'claimsCount', width: 15 },
      { header: 'Avg Rejection Rate %\nمتوسط نسبة المرفوضات', key: 'avgRejectionRate', width: 20 },
      { header: 'Total Rejected (SAR)\nإجمالي المرفوضات', key: 'totalRejected', width: 20 }
    ];

    const rows = Object.entries(monthlyData).map(([month, claims]) => {
      const avgRejectionRate = claims.reduce((sum, r) => sum + r.initialRejectionRate, 0) / claims.length;
      const totalAmount = claims.reduce((sum, r) => sum + r.rejectedAmount.total, 0);

      return {
        month,
        claimsCount: claims.length,
        avgRejectionRate: `${avgRejectionRate.toFixed(2)}%`,
        totalRejected: totalAmount.toFixed(2)
      };
    });

    worksheet.addRows(rows);
  }

  private generatePhysicianReport(workbook: ExcelJS.Workbook, rejections: RejectionRecord[]): void {
    const worksheet = workbook.addWorksheet('Physician Analysis');

    worksheet.columns = [
      { header: 'Physician ID\nرقم الطبيب', key: 'physicianId', width: 20 },
      { header: 'Name\nالاسم', key: 'name', width: 30 },
      { header: 'Performance\nالأداء', key: 'performance', width: 20 }
    ];

    // Placeholder - would need physician data
    worksheet.addRow({
      physicianId: 'Coming Soon',
      name: 'Requires Physician Data',
      performance: 'N/A'
    });
  }

  private generateFinancialImpact(workbook: ExcelJS.Workbook, rejections: RejectionRecord[]): void {
    const totalBilled = rejections.reduce((sum, r) => sum + r.billedAmount.total, 0);
    const totalRejected = rejections.reduce((sum, r) => sum + r.rejectedAmount.total, 0);
    const totalAppealed = rejections.reduce((sum, r) => sum + (r.appealedAmount?.total || 0), 0);
    const totalRecovered = rejections.reduce((sum, r) => sum + (r.recoveredAmount?.total || 0), 0);

    const netLoss = totalRejected - totalRecovered;
    const rejectionImpact = (totalRejected / totalBilled) * 100;
    const recoveryEfficiency = (totalRecovered / totalAppealed) * 100 || 0;

    const worksheet = workbook.addWorksheet('Financial Impact');

    worksheet.columns = [
      { header: 'Category\nالفئة', key: 'category', width: 40 },
      { header: 'Amount (SAR)\nالمبلغ', key: 'amount', width: 25 }
    ];

    worksheet.addRows([
      { category: 'Total Revenue Expected\nإجمالي الإيرادات المتوقعة', amount: totalBilled.toFixed(2) },
      { category: 'Total Rejections\nإجمالي المرفوضات', amount: totalRejected.toFixed(2) },
      { category: 'Total Appealed\nإجمالي المستأنف', amount: totalAppealed.toFixed(2) },
      { category: 'Total Recovered\nإجمالي المسترد', amount: totalRecovered.toFixed(2) },
      { category: 'Net Loss\nصافي الخسارة', amount: netLoss.toFixed(2) },
      { category: 'Rejection Impact %\nتأثير المرفوضات', amount: `${rejectionImpact.toFixed(2)}%` },
      { category: 'Recovery Efficiency %\nكفاءة الاسترداد', amount: `${recoveryEfficiency.toFixed(2)}%` }
    ]);
  }
}