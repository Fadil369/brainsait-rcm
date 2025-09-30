// MongoDB initialization script
db = db.getSiblingDB('brainsait');

// Create collections
db.createCollection('rejections');
db.createCollection('compliance_letters');
db.createCollection('users');
db.createCollection('audit_logs');
db.createCollection('physicians');
db.createCollection('branches');
db.createCollection('appeals');

// Create indexes for rejections
db.rejections.createIndex({ "insurance_company": 1 });
db.rejections.createIndex({ "tpa_name": 1 });
db.rejections.createIndex({ "rejection_received_date": -1 });
db.rejections.createIndex({ "status": 1 });
db.rejections.createIndex({ "branch": 1 });

// Create indexes for compliance letters
db.compliance_letters.createIndex({ "recipient": 1 });
db.compliance_letters.createIndex({ "type": 1 });
db.compliance_letters.createIndex({ "due_date": 1 });

// Create indexes for audit logs
db.audit_logs.createIndex({ "timestamp": -1 });
db.audit_logs.createIndex({ "action": 1 });
db.audit_logs.createIndex({ "userId": 1 });

// Create indexes for users
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });

print('Database initialized successfully');