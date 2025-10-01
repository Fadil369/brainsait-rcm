# 🏥 BrainSAIT Healthcare Claims Management System

[![CI/CD](https://github.com/Fadil369/brainsait-rcm/actions/workflows/ci.yml/badge.svg)](https://github.com/Fadil369/brainsait-rcm/actions)
[![License](https://img.shields.io/badge/license-Proprietary-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.12-blue.svg)](https://python.org)
[![Node](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org)

> AI-Powered Healthcare Claims and Rejections Management Platform for Saudi Arabian Healthcare Providers with NPHIES Integration and FHIR R4 Compliance

## ✨ Features

### 🤖 AI-Powered Intelligence
- **Fraud Detection** - 5 algorithms (duplicate billing, unbundling, upcoding, phantom billing, ML anomalies)
- **Predictive Analytics** - Forecasting for rejection rates, recovery rates, and claim volumes
- **Risk Scoring** - Automated physician risk assessment
- **Pattern Recognition** - ML-based anomaly detection using Isolation Forest

### 🏥 Healthcare Compliance
- **FHIR R4 Validation** - Complete ClaimResponse/Claim validation
- **NPHIES Integration** - Saudi National Platform integration (submit claims, appeals, eligibility checks)
- **30-Day Compliance** - Automated tracking per Saudi regulations
- **Bilingual Support** - Full Arabic (RTL) and English (LTR) support

### 🔒 Enterprise Security
- **JWT Authentication** - Secure token-based authentication
- **Role-Based Access Control** - ADMIN, MANAGER, ANALYST roles
- **HIPAA Audit Logging** - Complete PHI access tracking
- **Sentry Error Tracking** - PHI-sanitized error monitoring

### 📊 Comprehensive API
- **30+ Endpoints** covering all business operations
- **RESTful Design** with OpenAPI/Swagger documentation
- **Async Processing** for optimal performance
- **Rate Limiting** for API protection

### 📈 Monitoring & Observability
- **Prometheus Metrics** - Business and system metrics
- **Health Checks** - `/health` and `/metrics` endpoints
- **Real-time Logs** - Structured logging
- **Performance Tracking** - Request duration, database operations

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and **npm** 9+
- **Python** 3.12+
- **MongoDB** 7+
- **Redis** 7+ (optional)

### Installation

```bash
# Clone repository
git clone https://github.com/Fadil369/brainsait-rcm.git
cd brainsait-rcm

# Install dependencies
npm install
cd apps/api && pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start services
docker-compose up -d mongodb redis

# Start API
cd apps/api
uvicorn main:app --reload

# Start web dashboard
cd apps/web
npm run dev
```

### Access Points
- **API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Web Dashboard:** http://localhost:3000
- **Demo Shell:** http://localhost:3000/demo (NEW!)
- **Health Check:** http://localhost:8000/health
- **Metrics:** http://localhost:8000/metrics

## 🎨 Demo Shell

Experience the platform with our new **modern, accessible demo interface**:

- ✅ **Live API Status** - Real-time health monitoring with status chips
- ✅ **ARIA-Compliant** - Full keyboard navigation and screen reader support
- ✅ **Bilingual** - English/Arabic with RTL layout
- ✅ **Interactive Playground** - Test API endpoints directly
- ✅ **Responsive Design** - Works on all devices
- ✅ **Glassmorphism UI** - Modern, professional aesthetics

**Access the demo:** `/demo` route (e.g., `http://localhost:3000/demo`)

## 📚 Documentation

- **[API Documentation](API_DOCUMENTATION.md)** - Complete API reference
- **[Setup Guide](SETUP_GUIDE.md)** - Detailed installation instructions
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Production deployment
- **[Enhancement Summary](ENHANCEMENT_SUMMARY.md)** - Feature overview
- **[Contributing Guidelines](CONTRIBUTING.md)** - Development standards (NEW!)
- **[Security Policy](SECURITY.md)** - Vulnerability reporting (NEW!)
- **[Changelog](CHANGELOG.md)** - Release history (NEW!)

## 🏗️ Architecture

### System Overview
```
Frontend (Next.js) → API Gateway (FastAPI) → Services & AI → Database (MongoDB)
         ↓                    ↓                    ↓                ↓
    Cloudflare Pages    Authentication        Microservices      Atlas/Local
```

### Core Components

**Frontend Layer:**
- Next.js 14 dashboard with SSG
- Responsive UI with Tailwind CSS
- Bilingual support (AR/EN)
- Deployed on Cloudflare Pages

**API Layer:**
- FastAPI async backend
- JWT authentication & RBAC
- 30+ RESTful endpoints
- OpenAPI/Swagger docs

**Services Layer:**
- Fraud Detection (5 ML algorithms)
- Predictive Analytics (Prophet)
- FHIR R4 Validator
- NPHIES Integration
- WhatsApp Notifications
- Audit Logger (HIPAA-compliant)

**Data Layer:**
- MongoDB (primary database)
- Redis (caching)
- Prometheus (metrics)

## 🧪 Testing

```bash
# Run API tests
cd apps/api
pytest tests/ -v

# Run with coverage
pytest tests/ -v --cov=. --cov-report=html

# Run only unit tests (skip integration)
pytest tests/ -v -m "not integration"

# Run frontend tests
cd apps/web
npm test
```

## 🚢 Deployment

### Cloudflare Pages (Frontend)
```bash
# See DEPLOY_GUIDE.md for detailed instructions
# Build command: npm run build --workspace=apps/web
# Output directory: apps/web/.next
```

### Railway/Render (Backend)
```bash
# Build command: pip install -r requirements.txt
# Start command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

## 🌐 Live Demo

- **Frontend:** https://brainsait-rcm.pages.dev (coming soon)
- **API:** https://api.brainsait.com (coming soon)

## 📊 Key Technologies

### Backend
- **FastAPI** - Modern async Python web framework
- **MongoDB** - NoSQL database
- **Redis** - Caching and message broker
- **Celery** - Distributed task queue

### Frontend
- **Next.js 14** - React framework
- **Tailwind CSS** - Utility-first CSS
- **Framer Motion** - Animation library
- **React Native** - Mobile app framework

### AI/ML
- **scikit-learn** - Machine learning
- **Prophet** - Time series forecasting
- **pandas** - Data manipulation
- **numpy** - Numerical computing

### Monitoring
- **Sentry** - Error tracking
- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization (optional)

## 🤝 Contributing

This is a proprietary project. For access or contributions, contact: support@brainsait.com

## 📄 License

Proprietary - BrainSAIT Healthcare Solutions © 2024

## 📞 Support

- **Email:** support@brainsait.com
- **Documentation:** [See docs folder](./docs)
- **Issues:** [GitHub Issues](https://github.com/Fadil369/brainsait-rcm/issues)

## 🌐 Live Demo

- **Production:** https://brainsait-rcm.pages.dev
- **GitHub:** https://github.com/Fadil369/brainsait-rcm
- **API Docs:** (Deploy API to access /docs endpoint)

## 🎯 Roadmap

- [x] Core API with 30+ endpoints
- [x] AI fraud detection (5 algorithms)
- [x] Predictive analytics (Prophet forecasting)
- [x] FHIR R4 validation
- [x] NPHIES integration
- [x] Authentication & RBAC
- [x] HIPAA audit logging
- [x] WhatsApp notifications
- [x] CI/CD pipeline
- [x] Comprehensive testing
- [x] Deployed to Cloudflare Pages
- [ ] API deployment (Railway/Render)
- [ ] Mobile app completion
- [ ] Real-time updates (WebSocket)
- [ ] Advanced analytics charts
- [ ] Custom report builder
- [ ] Multi-tenant support

## 🌟 Acknowledgments

- Built with [Claude Code](https://claude.com/claude-code)
- Powered by AI and modern web technologies
- Designed for Saudi Arabian healthcare providers

---

**Made with ❤️ for Healthcare Professionals**

_Empowering healthcare providers with AI-driven insights to optimize claims management and reduce rejections._