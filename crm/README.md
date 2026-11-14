# BIMTECH Online WhatsApp CRM

## Project brief

Build a private lead-management CRM for BIMTECH Online PGDM enquiries.

- Website: https://bimtechonline.in/
- WhatsApp Business number supplied by the owner: +91 87458 63882
- Existing WhatsApp Business app: preserve it where Meta Coexistence eligibility allows
- Initial team size: 1-4 counsellors
- Primary users: CRM administrator and admissions counsellors

## Current website lead flow (important)

The current homepage form in `index.html` validates the name, mobile number, programme interest and consent, then opens a pre-filled `wa.me` message. It does **not** save the lead to a database or send the form to a CRM. The CRM integration must change this to submit the lead securely to the CRM API first, then show a clear success state. WhatsApp handoff should be an optional next action, not the only record of the enquiry.

## Recommended architecture

- Frontend: responsive CRM dashboard, accessible only to authenticated team members.
- Backend: Node.js + TypeScript API with input validation, role checks and audit logging.
- Database: PostgreSQL.
- Hosting: managed application hosting and managed PostgreSQL (Render is a proposed option; final account and deployment approval required).
- WhatsApp: official Meta WhatsApp Business Platform Cloud API using Embedded Signup / Coexistence for the existing Business App number, if the account is eligible.
- Webhooks: verify Meta webhook challenge/signature, process inbound messages and delivery/read status updates, and make webhook processing idempotent.
- Secrets: store Meta tokens, app secret, verify token and database credentials only in the hosting provider's encrypted environment variables. Never commit secrets to Git.

## MVP features

1. Capture website enquiries directly into PostgreSQL.
2. Store name, mobile, programme interest, consent timestamp, source page, created time and UTM campaign fields where available.
3. Lead inbox with search, filters and duplicate detection by normalized mobile number.
4. Lead stages: New, Contacted, Interested, Follow-up, Applied, Enrolled, Not Interested and Lost.
5. Assign each lead to one of 1-4 counsellors.
6. Record notes, next follow-up date, owner and activity history.
7. Lead detail page with conversation timeline.
8. WhatsApp inbound/outbound message sync through official webhooks/API.
9. Approved WhatsApp message templates for first contact and follow-ups outside the customer-service window.
10. Dashboard for new leads, overdue follow-ups, counsellor workload and stage conversion.
11. Admin and counsellor roles; counsellors see assigned leads, admins see all leads.
12. Export permissions, retention controls, consent records and audit trail.

## Core data model

- users: counsellor/admin accounts and password hashes or identity-provider subject
- leads: contact details, source, programme, stage, assigned user, consent and timestamps
- conversations: lead, WhatsApp contact, last-message timestamp and status
- messages: WhatsApp message ID, direction, type, content/media metadata, status and timestamps
- activities: assignment changes, notes, status changes and follow-up events
- webhook_events: unique provider event IDs / hashes for deduplication and troubleshooting

## API outline

- POST /api/public/leads — validate and create website enquiry
- GET /api/leads — authenticated, filtered lead inbox
- GET /api/leads/:id — lead detail and activity timeline
- PATCH /api/leads/:id — update stage, owner and follow-up
- POST /api/leads/:id/notes — add counsellor note
- POST /api/whatsapp/send — send approved/free-form messages subject to Meta policy
- GET /api/whatsapp/webhook — Meta webhook verification
- POST /api/whatsapp/webhook — receive messages and status events

## Delivery phases

### Phase 1 — CRM foundation
Database, secure login, roles, lead inbox, lead details, assignment, status pipeline, notes and follow-up reminders.

### Phase 2 — Website integration
Replace the homepage's WhatsApp-only form flow with secure CRM lead capture. Confirm a successful save before offering a WhatsApp chat handoff. Add server-side validation, rate limiting, spam protection and source/UTM tracking.

### Phase 3 — WhatsApp integration
Complete Meta Embedded Signup for the supplied existing number using Coexistence if eligible. Configure webhook, message sync, approved templates and send/receive handling. Test app/API message echo and delivery status.

### Phase 4 — Reporting and launch
Counsellor dashboard, conversion reports, audit review, backup/restore test, privacy notice review, production deployment and end-to-end acceptance tests.

## External setup required before live WhatsApp messaging

The account owner must complete Meta's authorised Embedded Signup and approve the connection of the number. The developer will need the resulting WhatsApp Business Account ID, Phone Number ID and appropriately scoped access credentials stored securely as deployment secrets. Do not send OTPs, passwords or access tokens in chat or commit them to GitHub.

Meta approval, template approval, messaging policy compliance and applicable WhatsApp charges are outside the code repository and must be completed before production messaging.

## Security and privacy baseline

- HTTPS only; secure session cookies and CSRF protection where applicable.
- Password hashing or a trusted identity provider; no shared counsellor login.
- Least-privilege admin/counsellor access and audit logs.
- Validate and normalize phone numbers; rate-limit public lead creation.
- Record affirmative contact consent and honour opt-outs.
- Follow Meta's 24-hour customer-service window and template rules.
- Minimize personal data, restrict exports and define a retention/deletion process.
- No secrets or real lead personal data in source control or test fixtures.

## Acceptance criteria

- A valid website enquiry appears once in the CRM without requiring the visitor to press Send in WhatsApp.
- Duplicate submissions are safely detected/handled.
- Admin can assign a lead to any counsellor; counsellors can update their assigned leads.
- Stage changes, notes and follow-up dates are persisted and auditable.
- Inbound WhatsApp messages attach to the correct lead/contact.
- Outbound messages are sent only through the official API and permitted message window/template rules.
- Failed webhook deliveries can be retried without creating duplicate messages.
- No production credentials or lead personal data are committed to GitHub.


## Confirmed initial setup preferences

- Primary device: iPhone
- Initial CRM users: one administrator
- Access: both mobile and computer
- Initial WhatsApp number: +91 87458 63882 (existing WhatsApp Business account, owner-reported)

## Development status

- `crm/index.html` is an initial responsive, single-user dashboard prototype.
- The prototype supports manually adding/editing leads, searching/filtering, stage tracking, follow-up dates and CSV export.
- Prototype data is stored in the current browser's local storage only. It is not a secure production database and is not shared across devices.
- Do not enter real student personal data in the prototype.
- No website form changes have been made; the existing website lead form must not be switched to an API until the production backend is deployed and tested.
- Next engineering step: implement the authenticated API and PostgreSQL persistence, then deploy the service and database. After that, connect website form capture and complete Meta's authorised WhatsApp onboarding. Production credentials must be configured as hosting secrets, never committed here.
