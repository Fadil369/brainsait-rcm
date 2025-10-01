-- BrainSAIT RCM - Seed Data
-- Initial users and test data

-- Create default admin user
-- Password: Admin@123 (hashed with bcrypt)
INSERT INTO users (id, email, password_hash, full_name, role, department, is_active)
VALUES (
    'usr_admin_001',
    'admin@brainsait.com',
    '$2b$10$YourHashedPasswordHere',
    'System Administrator',
    'ADMIN',
    'IT',
    1
);

-- Create sample users for different roles
INSERT INTO users (id, email, password_hash, full_name, role, department, branch, is_active)
VALUES
    ('usr_mgr_001', 'manager@brainsait.com', '$2b$10$YourHashedPasswordHere', 'Ahmed Al-Rashid', 'MANAGER', 'Claims', 'Riyadh Main', 1),
    ('usr_phy_001', 'physician@brainsait.com', '$2b$10$YourHashedPasswordHere', 'Dr. Fatima Al-Zahrani', 'PHYSICIAN', 'Cardiology', 'Jeddah Branch', 1),
    ('usr_bill_001', 'billing@brainsait.com', '$2b$10$YourHashedPasswordHere', 'Mohammed Al-Qahtani', 'BILLING_STAFF', 'Billing', 'Riyadh Main', 1),
    ('usr_view_001', 'viewer@brainsait.com', '$2b$10$YourHashedPasswordHere', 'Sara Al-Harbi', 'VIEWER', 'Analytics', 'Riyadh Main', 1);

-- Sample rejection records
INSERT INTO rejections (
    id, claim_id, patient_id, patient_name,
    tpa_name, insurance_company, policy_number,
    billed_amount_net, billed_amount_vat, billed_amount_total,
    rejected_amount_net, rejected_amount_vat, rejected_amount_total,
    service_date, submission_date, rejection_date, response_deadline,
    status, rejection_reason, rejection_code,
    physician_name, specialty,
    is_within_30_days, days_until_deadline,
    nphies_reference, reception_mode,
    created_by
) VALUES
    (
        'rej_001',
        'CLM-2025-001',
        'PAT-12345',
        'Abdullah Mohammed Al-Harthy',
        'MedGulf TPA',
        'Bupa Arabia',
        'POL-2024-5678',
        500000, -- 5000.00 SAR net
        75000,  -- 750.00 SAR VAT (15%)
        575000, -- 5750.00 SAR total
        200000, -- 2000.00 SAR rejected net
        30000,  -- 300.00 SAR VAT
        230000, -- 2300.00 SAR rejected total
        '2025-01-15',
        '2025-01-20',
        '2025-01-25',
        '2025-02-24',
        'PENDING_REVIEW',
        'Insufficient documentation - Medical necessity not established',
        'MED-001',
        'Dr. Fatima Al-Zahrani',
        'Cardiology',
        1,
        15,
        'NPHIES-REF-2025-001',
        'NPHIES',
        'usr_bill_001'
    ),
    (
        'rej_002',
        'CLM-2025-002',
        'PAT-12346',
        'Noura Ahmed Al-Saud',
        'NextCare TPA',
        'Tawuniya',
        'POL-2024-9012',
        1200000, -- 12000.00 SAR
        180000,  -- 1800.00 SAR VAT
        1380000,
        400000,
        60000,
        460000,
        '2025-01-10',
        '2025-01-15',
        '2025-01-22',
        '2025-02-21',
        'UNDER_APPEAL',
        'Service not covered under policy',
        'COV-002',
        'Dr. Khalid Al-Mutairi',
        'Orthopedics',
        1,
        12,
        'NPHIES-REF-2025-002',
        'PORTAL',
        'usr_bill_001'
    );

-- Sample appeal
INSERT INTO appeals (
    id, rejection_id, appeal_number,
    appeal_reason, supporting_documents,
    submission_method, submission_date,
    status,
    created_by
) VALUES (
    'app_001',
    'rej_002',
    'APP-2025-001',
    'Service is covered under emergency care clause. Providing additional medical records and policy interpretation.',
    '["https://r2.brainsait.com/docs/medical-report-001.pdf", "https://r2.brainsait.com/docs/policy-clause.pdf"]',
    'NPHIES',
    '2025-01-23',
    'SUBMITTED',
    'usr_mgr_001'
);

-- Sample compliance letter
INSERT INTO compliance_letters (
    id, rejection_id, letter_type,
    recipient_name, recipient_email, recipient_organization,
    subject_en, subject_ar,
    body_en, body_ar,
    status,
    created_by
) VALUES (
    'ltr_001',
    'rej_001',
    'INITIAL_NOTIFICATION',
    'Claims Manager',
    'claims@bupa.com.sa',
    'Bupa Arabia',
    'Initial Notification - Claim CLM-2025-001 (30-Day Deadline)',
    'إشعار أولي - مطالبة CLM-2025-001 (موعد 30 يوم)',
    'Dear Claims Manager,\n\nThis is to notify you that claim CLM-2025-001 submitted on 2025-01-20 has been rejected. Per Saudi insurance regulations, we request a response within 30 days.\n\nClaim Details:\n- Amount: 5,750.00 SAR\n- Patient: Abdullah Mohammed Al-Harthy\n- Service Date: 2025-01-15\n\nPlease review and respond by 2025-02-24.\n\nBest regards,\nBrainSAIT Healthcare Team',
    'السادة / مدير المطالبات\n\nنحيطكم علماً بأن المطالبة رقم CLM-2025-001 المقدمة بتاريخ 2025-01-20 تم رفضها. وفقاً للأنظمة السعودية، نطلب الرد خلال 30 يوماً.\n\nتفاصيل المطالبة:\n- المبلغ: 5,750.00 ريال\n- المريض: عبدالله محمد الحارثي\n- تاريخ الخدمة: 2025-01-15\n\nيرجى المراجعة والرد قبل 2025-02-24.\n\nمع خالص التحية،\nفريق BrainSAIT الصحي',
    'SENT',
    'usr_mgr_001'
);

-- Sample audit log
INSERT INTO audit_logs (
    id, user_id, event_type, resource_type, resource_id,
    action, description, ip_address
) VALUES
    (
        'aud_001',
        'usr_bill_001',
        'CREATE',
        'rejection',
        'rej_001',
        'Created new rejection record',
        'User created rejection record for claim CLM-2025-001',
        '192.168.1.100'
    ),
    (
        'aud_002',
        'usr_mgr_001',
        'CREATE',
        'appeal',
        'app_001',
        'Created appeal for rejection',
        'User submitted appeal for rejection rej_002',
        '192.168.1.101'
    );
