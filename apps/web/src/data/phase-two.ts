export type AppStorePreview = {
  id: string;
  title: string;
  description: string;
  category: string;
};

export type AcademyModule = {
  id: string;
  title: string;
  duration: string;
  summary: string;
};

export type PartnerPreview = {
  id: string;
  name: string;
  focus: string;
  status: string;
};

export const PHASE_TWO_APP_STORE: AppStorePreview[] = [
  {
    id: 'automations',
    title: 'Automation library',
    description: 'Prebuilt denial workflows that pair with claims scrubbing insights to reduce manual rework.',
    category: 'Automation',
  },
  {
    id: 'payer-connect',
    title: 'Payer collaboration kit',
    description: 'Secure messaging templates, SLA tracking, and escalation guardrails for high-impact payers.',
    category: 'Collaboration',
  },
  {
    id: 'analytics',
    title: 'Predictive analytics pack',
    description: 'Machine learning powered anomaly detection models tuned for Gulf healthcare claim patterns.',
    category: 'Analytics',
  },
];

export const PHASE_TWO_ACADEMY: AcademyModule[] = [
  {
    id: 'rcm-foundations',
    title: 'RCM foundations for hybrid care networks',
    duration: '90 min',
    summary: 'Overview of Saudi regulatory checkpoints, clinical hand-offs, and denial prevention best practices.',
  },
  {
    id: 'appeals-lab',
    title: 'Appeals lab and escalation tactics',
    duration: '60 min',
    summary: 'Hands-on workshop using BrainSAIT tooling to rehearse payer escalations and timeline tracking.',
  },
  {
    id: 'analytics-campus',
    title: 'Analytics campus for exec dashboards',
    duration: '45 min',
    summary: 'Teaches leaders how to translate trend indicators into staffing, budgeting, and risk posture decisions.',
  },
];

export const PHASE_TWO_PARTNERS: PartnerPreview[] = [
  {
    id: 'payer-network',
    name: 'Gulf Payer Network',
    focus: 'Unified APIs for remittance advice, status inquiries, and retroactive authorization workflows.',
    status: 'Integration preview',
  },
  {
    id: 'telehealth',
    name: 'TeleVisit Plus',
    focus: 'Virtual care claim bundling and post-visit eligibility verification automation.',
    status: 'Exploration',
  },
  {
    id: 'analytics-alliance',
    name: 'Insightful Analytics',
    focus: 'Advanced denial propensity and utilization forecasting models tuned for Saudi data patterns.',
    status: 'Signed memorandum',
  },
  {
    id: 'collections',
    name: 'Resolve360',
    focus: 'Field collections integration and dispute tracking for high-touch patient balances.',
    status: 'Pilot kicking off',
  },
];
