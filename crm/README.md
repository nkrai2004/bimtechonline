# BIMTECH Online WhatsApp-first CRM

## Product direction (confirmed)

The CRM is WhatsApp-first. The counsellor should be able to handle routine student communication from the CRM inbox, with incoming and outgoing messages synchronised through Meta's official WhatsApp Business Platform. The existing WhatsApp Business mobile app should remain usable alongside the CRM if the phone number and account qualify for Meta's app/API Coexistence onboarding.

- Website: https://bimtechonline.in/
- WhatsApp number supplied by the owner: +91 87458 63882
- Existing WhatsApp Business app: retain through Coexistence if Meta confirms eligibility
- Initial CRM users: one administrator
- Devices: iPhone and desktop
- Message scope: text, images, documents, audio/video where supported by the official API, plus delivery/read status events
- CRM source code: GitHub repository `nkrai2004/bimtechonline`, branch `main`
- Lead database: private Google Sheet owned by `info@bimtechonline.in`
- Google Sheet ID: stored in server-side Apps Script configuration; never expose credentials or tokens in browser code

## Confirmed Google Sheets setup

Spreadsheet tabs created:
- `Leads`
- `Activities`
- `Settings`

Apps Script source is versioned in:
- `crm/apps-script/Code.gs`
- `crm/apps-script/Index.html`

The Apps Script web app has been deployed and the owner confirmed its health-check response. Its access setting is **Only myself**. The Apps Script UI is intended to remain private and should be used for authenticated CRM access.

Important: the existing Apps Script code is an early foundation, not a complete WhatsApp integration. The current web app health check was tested; full lead CRUD, identity enforcement, webhook handling, media handling, and production security still require end-to-end testing.

## Target architecture

1. **Website (GitHub Pages / existing website):** public enquiry form. Submit name, mobile, programme, consent, source page and campaign data to a dedicated public lead-capture endpoint. Do not expose the private CRM dashboard or Google Sheet.
2. **WhatsApp-first CRM UI:** authenticated counsellor inbox, served through the private Apps Script UI initially. GitHub remains the source of truth for code. UI includes lead list, conversation thread, composer, media attachments, templates, follow-up and status.
3. **Google Apps Script + private Google Sheet:** initial lead/activity store and private CRM operations.
4. **Public integration service:** a small HTTPS service is required for Meta webhook callbacks and secure website intake. It must validate Meta webhook signatures, handle retries/idempotency, protect secrets, and bridge events to the private data layer. GitHub Pages is static hosting and cannot itself receive webhooks or safely store Meta tokens.
5. **Meta WhatsApp Business Platform Cloud API:** official send/receive, media, templates and message status events. Use Coexistence onboarding for the existing app number only if Meta makes it available for this account.

The public integration service is a required backend component, not a replacement for GitHub as the source-code repository or Google Sheets as the agreed initial database. Hosting/provider choice must be approved before deployment. Do not make the Apps Script endpoint public merely to receive Meta webhooks: Apps Script web apps do not provide the request-header access needed for standard `X-Hub-Signature-256` validation in this implementation.

## WhatsApp-first workflow

- Website visitor submits enquiry and affirmative WhatsApp contact consent.
- Server validates and saves the lead once; duplicate mobile submissions are handled safely.
- CRM creates/opens a conversation for the lead.
- Any business-initiated first message is sent only using an approved template and in accordance with Meta policy.
- Student replies appear in the CRM inbox through webhooks.
- Counsellor sends replies from the CRM; the message is sent via Cloud API and recorded against the lead.
- Messages sent/received in the WhatsApp Business app are synchronised where Coexistence supports the relevant event/feature; this must be verified during onboarding and testing.
- Inbound media metadata and media IDs are stored with the message; media is fetched from Meta through authenticated server-side API calls and stored only in an approved private storage location. Do not put media access tokens in the browser.
- Delivery/read/failure updates update the corresponding message record.
- Follow-ups and opt-outs are recorded; automation must respect consent, template and customer-service-window rules.

## Core data model (Google Sheets tabs / future migration-safe model)

### Leads
Lead ID, created/updated timestamps, full name, normalized mobile, email, programme, source, stage, next follow-up, last contacted, consent, notes.

### Activities
Activity ID, Lead ID, timestamp, type, summary, next follow-up, created by.

### Settings
Approved stage list and non-secret CRM configuration.

### Additional WhatsApp records (to add before production)
- Conversations: conversation ID, lead ID, WhatsApp contact, last inbound/outbound timestamps, window status.
- Messages: Meta message ID, conversation/lead ID, direction, message type, text, media ID/reference, timestamp, status, error details.
- WebhookEvents: event/message ID or stable deduplication key, received timestamp, processing status.
- Templates: Meta template name, language, category, approval status, purpose.

Do not store long-lived media blobs or access tokens in spreadsheet cells. Store only metadata and private file references.

## Required capabilities

- Lead inbox with search, stage filters and duplicate detection.
- Lead detail and full chronological conversation history.
- WhatsApp send/receive for supported message types, including images and documents.
- Media upload/download through server-side authenticated API calls.
- Approved template picker for business-initiated messages and out-of-window follow-ups.
- Message delivery/read/failure indicators.
- Follow-up reminders, notes, lead stages and CSV export with access control.
- Website form capture with consent timestamp, source page and UTM fields.
- Webhook signature validation, retries, idempotency and audit logging.
- Mobile-friendly layout for iPhone and desktop.

## Meta onboarding prerequisites

The owner or an authorised administrator of the BIMTECH Meta Business Portfolio must complete the official onboarding and grant the required permissions. The current user previously indicated they do not have Meta Business Portfolio admin access, so an authorised BIMTECH administrator will need to participate.

During onboarding, confirm:
- The Business Portfolio and WhatsApp Business Account ownership.
- Whether +91 87458 63882 is eligible for WhatsApp Business app/API Coexistence.
- Phone-number verification and display-name status.
- WhatsApp Business Account ID and Phone Number ID.
- Required messaging/management permissions and system-user or business token setup.
- Webhook subscription for WhatsApp Business Account events.
- Payment method, message pricing and template approvals.

Never send passwords, OTPs, access tokens or app secrets in chat. Configure credentials only in encrypted server-side environment variables / script properties as appropriate. Never commit secrets to GitHub.

## Messaging policy and consent

- Record explicit consent for WhatsApp contact on the website enquiry form and retain its timestamp/source.
- Respect opt-outs and do not message contacts who have withdrawn consent.
- Within the customer-service window, use permitted free-form replies.
- Outside the 24-hour customer-service window, use an approved template where required.
- Follow Meta's current commerce, business messaging, quality and template policies.
- Confirm applicable pricing before launch.

## Delivery phases

### Phase 1 — Private CRM foundation
Complete authenticated CRM UI, lead CRUD, Google Sheets persistence, lead/activity history and secure access testing.

### Phase 2 — Meta onboarding and Coexistence check
An authorised Meta Business Portfolio admin completes onboarding for the existing number. Confirm app/API coexistence and the exact supported sync behaviour before committing to production workflow.

### Phase 3 — WhatsApp inbox and messaging
Deploy the secured public integration service; configure webhook verification/signature validation, inbound/outbound text and media, templates, delivery/read status, retries and audit history.

### Phase 4 — Website lead capture
Connect the website form to the public lead-capture endpoint. Save the lead before confirming success; initiate WhatsApp contact only with recorded consent and policy-compliant message type.

### Phase 5 — End-to-end testing and launch
Test app/API coexistence, website capture, duplicate leads, inbound/outbound text and media, webhook retries, opt-out, template messaging, iPhone/desktop use, backup and recovery.

## Current development status

- `crm/index.html`: earlier browser-local prototype; not production and not connected to Sheets.
- `crm/apps-script/Code.gs`: early Apps Script backend and private web-app entry point. Needs security review and end-to-end test.
- `crm/apps-script/Index.html`: WhatsApp-first CRM dashboard foundation using `google.script.run` for server calls. Messaging UI/API is not yet implemented.
- Apps Script setup: user confirmed the Leads, Activities and Settings tabs exist.
- Deployment health check: user confirmed JSON response from deployed `/exec` URL.
- Deployment access: user confirmed **Only myself**.
- No production WhatsApp messages have been sent.
- No website form has been changed yet.
- Meta Business Portfolio admin onboarding and Coexistence eligibility are not yet confirmed.

## Next decisions / blockers

1. An authorised BIMTECH Meta Business Portfolio administrator must join the onboarding process.
2. Choose and approve the public HTTPS integration-service host. This is required for secure webhook signature verification; GitHub Pages alone cannot do this.
3. Complete a security review of the Apps Script identity check and deployment behaviour before real student data is entered.
4. Confirm Meta Coexistence eligibility and test app/API message synchronisation before launch.
