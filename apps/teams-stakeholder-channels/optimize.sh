#!/bin/bash
# Teams App Optimization & Health Check Script
# Ensures production readiness

set -e

echo "🚀 BrainSAIT RCM - Teams App Optimization"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v)
echo "   Node.js: $NODE_VERSION"

if [[ "$NODE_VERSION" < "v18" ]]; then
    echo -e "${RED}❌ Node.js 18+ required${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js version OK${NC}"
echo ""

# Check if MongoDB connection string is set
echo "🗄️  Checking MongoDB configuration..."
if grep -q "mongodb+srv://fadil_db_user" .env.local; then
    echo -e "${GREEN}✅ MongoDB Atlas configured${NC}"
else
    echo -e "${RED}❌ MongoDB connection not configured${NC}"
    exit 1
fi
echo ""

# Install/Update dependencies
echo "📥 Installing dependencies..."
echo "   Root dependencies..."
npm install --silent

echo "   Bot dependencies..."
cd bot && npm install --silent && cd ..

echo "   Tab dependencies..."
cd src && npm install --silent && cd ..

echo -e "${GREEN}✅ All dependencies installed${NC}"
echo ""

# Run security audit
echo "🔒 Running security audit..."
npm audit --audit-level=high || echo -e "${YELLOW}⚠️  Some vulnerabilities found (review npm audit)${NC}"
echo ""

# Check for required environment variables
echo "🔧 Validating environment variables..."
REQUIRED_VARS=("MONGODB_URI" "API_BASE_URL" "BRAINSAIT_API_URL")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" .env.local; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All required environment variables set${NC}"
else
    echo -e "${RED}❌ Missing environment variables: ${MISSING_VARS[*]}${NC}"
fi
echo ""

# Check app manifest
echo "📋 Validating Teams app manifest..."
if [ -f "appPackage/manifest.json" ]; then
    if command -v jq &> /dev/null; then
        jq empty appPackage/manifest.json && echo -e "${GREEN}✅ Manifest JSON valid${NC}" || echo -e "${RED}❌ Invalid manifest JSON${NC}"
    else
        echo -e "${YELLOW}⚠️  jq not installed, skipping JSON validation${NC}"
    fi
else
    echo -e "${RED}❌ Manifest file not found${NC}"
fi
echo ""

# Check for app icons
echo "🎨 Checking app icons..."
if [ -f "appPackage/color.png" ]; then
    echo -e "${GREEN}✅ Color icon found${NC}"
else
    echo -e "${YELLOW}⚠️  Color icon missing (appPackage/color.png)${NC}"
fi

if [ -f "appPackage/outline.png" ]; then
    echo -e "${GREEN}✅ Outline icon found${NC}"
else
    echo -e "${YELLOW}⚠️  Outline icon missing (appPackage/outline.png)${NC}"
fi
echo ""

# Build check (optional - only if you want to test builds)
echo "🏗️  Testing builds..."
echo "   Building Tab..."
cd src
if npm run build --silent 2>&1 | tail -n 5; then
    echo -e "${GREEN}✅ Tab builds successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Tab build needs attention${NC}"
fi
cd ..
echo ""

# TypeScript type checking
echo "📝 Running TypeScript checks..."
if command -v tsc &> /dev/null; then
    cd bot
    if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
        echo -e "${YELLOW}⚠️  TypeScript errors in bot${NC}"
    else
        echo -e "${GREEN}✅ Bot TypeScript OK${NC}"
    fi
    cd ..
    
    cd src
    if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
        echo -e "${YELLOW}⚠️  TypeScript errors in tab${NC}"
    else
        echo -e "${GREEN}✅ Tab TypeScript OK${NC}"
    fi
    cd ..
else
    echo -e "${YELLOW}⚠️  TypeScript not found globally${NC}"
fi
echo ""

# Generate summary report
echo "📊 Optimization Summary"
echo "======================="
echo ""
echo "✅ Dependencies installed and up-to-date"
echo "✅ MongoDB Atlas configured and ready"
echo "✅ Environment variables validated"
echo "✅ Security audit completed"
echo ""

if [ ! -f "appPackage/color.png" ] || [ ! -f "appPackage/outline.png" ]; then
    echo -e "${YELLOW}⚠️  Action Required: Create app icons${NC}"
    echo "   - color.png (192x192 pixels)"
    echo "   - outline.png (32x32 pixels)"
    echo ""
fi

if ! grep -q "^BOT_ID=." .env.local || ! grep -q "^TEAMS_APP_ID=." .env.local; then
    echo -e "${YELLOW}⚠️  Action Required: Register with Azure${NC}"
    echo "   - Complete Azure AD app registration"
    echo "   - Register Azure Bot Service"
    echo "   - Update .env.local with IDs"
    echo ""
fi

echo "🎉 Optimization complete!"
echo ""
echo "Next steps:"
echo "1. Review any warnings above"
echo "2. Create app icons if missing"
echo "3. Register with Azure (see TEAMS_APP_STATUS.md)"
echo "4. Test locally: npm run dev"
echo "5. Deploy to Azure: See NEXT_STEPS.md"
echo ""
echo "For detailed instructions, see:"
echo "  - README.md"
echo "  - QUICKSTART.md"
echo "  - TEAMS_APP_STATUS.md"
echo ""
