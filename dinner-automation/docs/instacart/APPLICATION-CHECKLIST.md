# Instacart Developer Platform Application Checklist

> **Status:** Pre-application preparation phase  
> **Last Updated:** February 7, 2026  
> **Application URL:** https://www.instacart.com/company/business/developers

---

## Pre-Application Requirements

Before applying, ensure you have the following ready:

### Business Information
- [ ] Business name (or personal name if sole proprietor)
- [ ] Business registration details (US or Canada)
- [ ] Contact email address
- [ ] Contact phone number
- [ ] Business address

### Developer Account Requirements
- [ ] Must be 18 years or older
- [ ] Must be a resident of US or Canada
- [ ] Must be a registered business (or individual developer)

### Application Details
- [ ] Brief overview of development experience/projects
- [ ] Intended use case description
- [ ] Description of the application/integration
- [ ] Expected user base or traffic volume

### Technical Prerequisites
- [ ] Understanding of REST APIs
- [ ] HTTPS-capable server for integration
- [ ] Error handling implementation plan
- [ ] Security measures for API key storage

### Compliance Agreements (Must Accept)
- [ ] Instacart Developer Platform Terms and Conditions
- [ ] API usage policies
- [ ] Data protection guidelines
- [ ] Instacart Privacy Policy
- [ ] Developer Guidelines

---

## Integration Requirements Checklist

Before requesting Production API key, verify:

### Code Implementation
- [ ] All API requests formatted per Instacart API specification
- [ ] Error handling implemented for all endpoints
- [ ] API key stored securely (environment variables)
- [ ] No hardcoded credentials in source code
- [ ] HTTPS used for all communications

### Required Minimum Functionality (RMF)
- [ ] Application exposes required functionality
- [ ] All API calls related to implemented functions enabled
- [ ] Shopping list creation working correctly
- [ ] Product matching logic implemented

### Account Setup
- [ ] Instacart Enterprise Service Desk account created (for technical support)
- [ ] Developer account profile complete
- [ ] Development API key obtained and tested

### Legal/Compliance
- [ ] Terms and Conditions reviewed and understood
- [ ] No prohibited use cases in application
- [ ] Privacy policy compliant with Instacart requirements
- [ ] Data handling practices documented

---

## For Affiliate Revenue (Optional)

If seeking affiliate commissions:
- [ ] Impact.com account ready to receive invitation
- [ ] Instacart Tastemakers account setup plan
- [ ] Tracking ID implementation plan
- [ ] Conversion tracking understanding

---

## Documents to Prepare

1. **Business Registration** - Proof of business entity (if applicable)
2. **Project Description** - 1-2 paragraph description of the dinner automation project
3. **Technical Architecture** - Brief outline of how the integration works
4. **Privacy Policy** - Document describing data handling practices
5. **User Flow Diagram** - How users will interact with the Instacart integration

---

## Timeline Expectations

| Phase | Expected Duration |
|-------|-------------------|
| Application Review | 1 week |
| Development Key Issued | Upon approval |
| Integration Development | 2-3 weeks (estimated) |
| Production Key Review | 1-2 business days |
| **Total to Production** | **~3-4 weeks** |

---

## Where to Apply

**Primary Application Page:**  
https://www.instacart.com/company/business/developers

**Documentation:**  
https://docs.instacart.com/developer_platform_api/

**Enterprise Service Desk (post-approval):**  
https://enterprise-servicedesk.instacart.com/

---

## Next Steps

1. Review all documentation in `/docs/instacart/`
2. Gather all required business information
3. Draft project description and use case
4. Submit application via the developer portal
5. Wait for approval email (typically 1 week)
6. Upon approval, obtain Development API key
7. Complete integration testing
8. Submit for Production API key

---

## Important Notes

- All applications are subject to review and approval
- Instacart reserves the right to deny applications at their discretion
- The Connect APIs (Fulfillment, Post-checkout) are for retailers only - not available to developer partners
- IDP Public API (what we'll likely use) does not access Instacart data directly - provides links to Instacart-hosted landing pages
- IDP Partner API offers deeper integration but requires additional review
