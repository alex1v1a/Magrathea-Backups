# Instacart Developer Platform - Application Guide

> Complete guide for applying to and integrating with the Instacart Developer Platform (IDP)

---

## Overview

The Instacart Developer Platform (IDP) allows developers to integrate Instacart's grocery ordering capabilities into their applications. For the dinner automation project, this enables creating shopping lists that pre-populate Instacart carts with ingredients from meal plans.

### Two API Tiers

| Tier | Access | Data Available | Use Case |
|------|--------|----------------|----------|
| **IDP Public API** | Easier to obtain | Links to Instacart-hosted pages | Basic shopping list creation |
| **IDP Partner API** | Requires deeper review | Real-time product search, pricing, availability | Rich product matching |

For our dinner automation use case, the **IDP Public API** should be sufficient.

---

## Application Process

### Step 1: Prepare Required Information

**Business Information:**
- Legal business name (or personal name)
- Business registration number (if applicable)
- Physical address (US or Canada)
- Contact email and phone

**Developer Profile:**
- Brief bio/background
- Development experience
- Past projects or portfolio

**Project Details:**
- Application name: "Dinner Automation"
- Description: Personal meal planning and grocery list automation tool
- Use case: Convert weekly meal plans into shoppable Instacart lists
- Expected users: Personal use (initially)

### Step 2: Submit Application

1. Visit: https://www.instacart.com/company/business/developers
2. Click "Get Started" or "Apply Now"
3. Complete the application form
4. Submit for review

### Step 3: Wait for Approval

- Typical review time: 1 week
- You will receive an email notification
- Upon approval, you'll get access to the Developer Dashboard

### Step 4: Obtain Development API Key

1. Log into Developer Dashboard
2. Generate Development API key
3. Begin integration development

### Step 5: Build Integration

- Implement API calls
- Test thoroughly
- Ensure error handling
- Document the integration

### Step 6: Request Production API Key

1. Create Enterprise Service Desk account
2. Submit Production API key request
3. Undergo review (1-2 business days)
4. Receive approval and activate Production key

---

## Required Accounts

### 1. Instacart Developer Account
- Created during application
- Access to API keys
- Usage monitoring
- **URL:** Part of developer portal

### 2. Enterprise Service Desk Account
- For technical support
- Required before Production key
- **URL:** https://enterprise-servicedesk.instacart.com/

### 3. Impact.com Account (Optional - for affiliates)
- For tracking commissions
- Receive invitation after Production approval
- Tracks conversions and affiliate payments

### 4. Instacart Tastemakers Account (Optional - for affiliates)
- Conversion tracking
- Affiliate payment processing
- Linked to Impact.com

---

## API Key Types

### Development API Key
- **When:** Available immediately after application approval
- **Purpose:** Development and testing
- **Limitations:** Limited requests, test environment
- **Expiry:** Typically long-lived for development

### Production API Key
- **When:** Available after integration review
- **Purpose:** Live traffic
- **Requirements:** 
  - Working integration
  - Error handling
  - Compliance with terms
  - Enterprise Service Desk account

---

## Review Criteria

Instacart reviews applications based on:

1. **Compliance** - 100% adherence to Terms & Conditions
2. **Technical** - Proper API request formatting
3. **Error Handling** - Graceful handling of API errors
4. **Security** - Proper API key protection
5. **Use Case** - Legitimate, non-competing application
6. **Business Viability** - Sustainable, legal business model

---

## Common Rejection Reasons

- Incomplete application information
- Violation of terms (scraping, data brokering)
- Security concerns (exposed API keys)
- Competing business model
- Prohibited content or use case
- Insufficient error handling
- Non-compliance with API specifications

---

## Integration Requirements

### Required Minimum Functionality

Your application must implement:

1. **Shopping List Creation**
   - Convert user data to Instacart line items
   - Generate shareable Instacart links

2. **Error Handling**
   - Handle API errors gracefully
   - User-friendly error messages
   - Retry logic where appropriate

3. **Security**
   - Secure API key storage
   - HTTPS for all communications
   - No exposure of credentials

### API Endpoints Used

For dinner automation, we likely need:

- `POST /idp/v1/products/products_link` - Create shopping list links
- `GET /idp/v1/retailers` - Check retailer availability

---

## Costs

| Item | Cost |
|------|------|
| Developer Platform Access | Free |
| Development API Key | Free |
| Production API Key | Free |
| Affiliate Program | Free to join (earn commissions) |
| API Usage | Free (within limits) |

---

## Support Resources

- **Documentation:** https://docs.instacart.com/developer_platform_api/
- **Enterprise Service Desk:** https://enterprise-servicedesk.instacart.com/
- **Email:** legal@instacart.com (for legal questions)
- **Security:** security-incidents@instacart.com

---

## Important Legal Notes

### Prohibited Activities

Per the Terms and Conditions, you CANNOT:

- Scrape or extract data from Instacart Platform
- Sell or transfer Instacart data to third parties
- Use data for advertising or targeting
- Replicate Instacart products/services
- Display items from multiple retailers on same screen
- Move items between retailer baskets
- Develop apps to migrate users off Instacart
- Use alternative checkout methods

### Data Usage

- Cannot create user profiles from Instacart data
- Cannot target users based on Instacart interactions
- Cannot compete with Instacart's advertising business
- Must comply with Instacart Privacy Addendum

### Intellectual Property

- Instacart owns all API materials
- You own your application
- Limited license to use Instacart Marks (with guidelines)
- Must display attribution where required

---

## Post-Approval Checklist

Once approved, before going live:

- [ ] Store API key securely (environment variable)
- [ ] Implement proper error handling
- [ ] Test all API endpoints
- [ ] Create user documentation
- [ ] Set up monitoring/logging
- [ ] Review terms compliance one final time
- [ ] Create Enterprise Service Desk account
- [ ] Submit Production API key request
- [ ] Wait for Production approval
- [ ] Deploy with Production key

---

## Affiliate Revenue Opportunity

After Production approval, you can:

1. Join Impact.com affiliate program (invitation sent by Instacart)
2. Integrate tracking IDs into API requests
3. Earn commissions on:
   - Completed orders originating from your app
   - New user sign-ups

**Note:** This is optional but recommended for monetization.
