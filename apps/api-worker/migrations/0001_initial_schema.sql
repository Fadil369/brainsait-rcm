-- BrainSAIT RCM - Initial Database Schema
-- Cloudflare D1 Migration

-- Users and Authentication
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'PHYSICIAN', 'BILLING_STAFF', 'VIEWER')),
    department TEXT,
    branch TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Rejection Records
CREATE TABLE IF NOT EXISTS rejections (
    id TEXT PRIMARY KEY,
    claim_id TEXT NOT NULL UNIQUE,
    patient_id TEXT NOT NULL,
    patient_name TEXT NOT NULL,

    -- Insurance Information
    tpa_name TEXT NOT NULL,
    insurance_company TEXT NOT NULL,
    policy_number TEXT,

    -- Financial Data (stored as integers in cents/halalas)
    billed_amount_net INTEGER NOT NULL,
    billed_amount_vat INTEGER NOT NULL,
    billed_amount_total INTEGER NOT NULL,
    rejected_amount_net INTEGER NOT NULL,
    rejected_amount_vat INTEGER NOT NULL,
    rejected_amount_total INTEGER NOT NULL,

    -- Dates
    service_date DATE NOT NULL,
    submission_date DATE NOT NULL,
    rejection_date DATE,
    response_deadline DATE,

    -- Status and Details
    status TEXT NOT NULL CHECK (status IN ('PENDING_REVIEW', 'UNDER_APPEAL', 'RECOVERED', 'FINAL_REJECTION', 'PARTIAL_RECOVERY')),
    rejection_reason TEXT NOT NULL,
    rejection_code TEXT,
    physician_name TEXT,
    specialty TEXT,

    -- Compliance Tracking
    is_within_30_days INTEGER DEFAULT 1,
    days_until_deadline INTEGER,

    -- NPHIES Integration
    nphies_reference TEXT,
    reception_mode TEXT CHECK (reception_mode IN ('NPHIES', 'PORTAL', 'EMAIL')),

    -- Metadata
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_rejections_claim_id ON rejections(claim_id);
CREATE INDEX idx_rejections_status ON rejections(status);
CREATE INDEX idx_rejections_tpa ON rejections(tpa_name);
CREATE INDEX idx_rejections_submission_date ON rejections(submission_date);
CREATE INDEX idx_rejections_physician ON rejections(physician_name);

-- Appeal Records
CREATE TABLE IF NOT EXISTS appeals (
    id TEXT PRIMARY KEY,
    rejection_id TEXT NOT NULL,
    appeal_number TEXT NOT NULL UNIQUE,

    -- Appeal Details
    appeal_reason TEXT NOT NULL,
    supporting_documents TEXT, -- JSON array of document URLs
    submission_method TEXT CHECK (submission_method IN ('NPHIES', 'PORTAL', 'EMAIL', 'FAX')),
    submission_date DATE NOT NULL,
    response_date DATE,

    -- Status
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PARTIAL_APPROVAL')),

    -- Financial Recovery
    recovered_amount_net INTEGER DEFAULT 0,
    recovered_amount_vat INTEGER DEFAULT 0,
    recovered_amount_total INTEGER DEFAULT 0,

    -- Response Details
    response_notes TEXT,
    response_reference TEXT,

    -- Metadata
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (rejection_id) REFERENCES rejections(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_appeals_rejection_id ON appeals(rejection_id);
CREATE INDEX idx_appeals_status ON appeals(status);
CREATE INDEX idx_appeals_submission_date ON appeals(submission_date);

-- Compliance Letters
CREATE TABLE IF NOT EXISTS compliance_letters (
    id TEXT PRIMARY KEY,
    rejection_id TEXT NOT NULL,

    -- Letter Details
    letter_type TEXT NOT NULL CHECK (letter_type IN ('INITIAL_NOTIFICATION', 'WARNING_FINAL', 'INFORMATION_REQUEST')),
    recipient_name TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_organization TEXT,

    -- Content
    subject_en TEXT NOT NULL,
    subject_ar TEXT NOT NULL,
    body_en TEXT NOT NULL,
    body_ar TEXT NOT NULL,

    -- Document Storage (R2)
    pdf_url TEXT,
    pdf_key TEXT, -- R2 object key

    -- Delivery Status
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED')),
    sent_at DATETIME,
    delivered_at DATETIME,

    -- Metadata
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (rejection_id) REFERENCES rejections(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_letters_rejection_id ON compliance_letters(rejection_id);
CREATE INDEX idx_letters_status ON compliance_letters(status);
CREATE INDEX idx_letters_type ON compliance_letters(letter_type);

-- Audit Trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    action TEXT NOT NULL,
    description TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata TEXT, -- JSON
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);

-- Fraud Detection Results
CREATE TABLE IF NOT EXISTS fraud_detections (
    id TEXT PRIMARY KEY,
    claim_id TEXT NOT NULL,
    risk_score REAL NOT NULL,
    fraud_types TEXT, -- JSON array
    anomaly_reasons TEXT, -- JSON array
    detection_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT CHECK (status IN ('FLAGGED', 'UNDER_INVESTIGATION', 'CLEARED', 'CONFIRMED_FRAUD')),
    investigated_by TEXT,
    investigation_notes TEXT,

    FOREIGN KEY (claim_id) REFERENCES rejections(claim_id),
    FOREIGN KEY (investigated_by) REFERENCES users(id)
);

CREATE INDEX idx_fraud_claim_id ON fraud_detections(claim_id);
CREATE INDEX idx_fraud_risk_score ON fraud_detections(risk_score);
CREATE INDEX idx_fraud_status ON fraud_detections(status);

-- Predictive Analytics Results
CREATE TABLE IF NOT EXISTS analytics_predictions (
    id TEXT PRIMARY KEY,
    prediction_type TEXT NOT NULL,
    prediction_date DATE NOT NULL,
    predicted_value REAL NOT NULL,
    confidence_score REAL,
    model_version TEXT,
    input_data TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_predictions_type ON analytics_predictions(prediction_type);
CREATE INDEX idx_predictions_date ON analytics_predictions(prediction_date);

-- NPHIES Submissions
CREATE TABLE IF NOT EXISTS nphies_submissions (
    id TEXT PRIMARY KEY,
    claim_id TEXT,
    appeal_id TEXT,
    submission_type TEXT NOT NULL CHECK (submission_type IN ('CLAIM', 'APPEAL')),

    -- NPHIES Details
    nphies_reference TEXT NOT NULL UNIQUE,
    bundle_id TEXT,

    -- Request/Response
    request_payload TEXT, -- JSON
    response_payload TEXT, -- JSON

    -- Status
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'SUBMITTED', 'ACKNOWLEDGED', 'REJECTED', 'ERROR')),
    submission_date DATETIME NOT NULL,
    response_date DATETIME,

    -- Error Handling
    error_code TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (claim_id) REFERENCES rejections(claim_id)
);

CREATE INDEX idx_nphies_claim_id ON nphies_submissions(claim_id);
CREATE INDEX idx_nphies_status ON nphies_submissions(status);
CREATE INDEX idx_nphies_reference ON nphies_submissions(nphies_reference);

-- WhatsApp Notifications
CREATE TABLE IF NOT EXISTS whatsapp_notifications (
    id TEXT PRIMARY KEY,
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    template_name TEXT,

    -- Delivery Status
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ')),
    twilio_sid TEXT,
    error_message TEXT,

    sent_at DATETIME,
    delivered_at DATETIME,
    read_at DATETIME,

    -- Related Resources
    related_type TEXT,
    related_id TEXT,

    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_whatsapp_phone ON whatsapp_notifications(phone_number);
CREATE INDEX idx_whatsapp_status ON whatsapp_notifications(status);
CREATE INDEX idx_whatsapp_related ON whatsapp_notifications(related_type, related_id);

-- Corrective Action Plans
CREATE TABLE IF NOT EXISTS corrective_actions (
    id TEXT PRIMARY KEY,
    title_en TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    description_en TEXT NOT NULL,
    description_ar TEXT NOT NULL,

    -- Scope
    branch TEXT,
    department TEXT,
    target_physician TEXT,

    -- Root Cause
    root_cause_category TEXT NOT NULL,
    identified_issues TEXT, -- JSON array

    -- Action Items
    action_items TEXT NOT NULL, -- JSON array

    -- Metrics
    baseline_metric REAL,
    target_metric REAL,
    current_metric REAL,

    -- Timeline
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    review_frequency TEXT,

    -- Status
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    effectiveness TEXT CHECK (effectiveness IN ('NOT_EVALUATED', 'EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE')),

    -- Assignments
    owner_id TEXT,
    stakeholders TEXT, -- JSON array of user IDs

    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (owner_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_actions_status ON corrective_actions(status);
CREATE INDEX idx_actions_branch ON corrective_actions(branch);
CREATE INDEX idx_actions_owner ON corrective_actions(owner_id);

-- Sessions (for JWT refresh tokens)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    refresh_token TEXT NOT NULL UNIQUE,
    access_token TEXT,
    ip_address TEXT,
    user_agent TEXT,
    expires_at DATETIME NOT NULL,
    revoked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
