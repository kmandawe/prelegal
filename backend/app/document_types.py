"""Registry of the legal document types the app can generate (PL-6).

A single source of truth for every supported document. The MNDA keeps its
bespoke creator (engine "mnda"); the other ten are driven by a generic engine
that renders a Cover Page from these field definitions and references the
published Common Paper Standard Terms by URL. The frontend fetches this registry
via GET /api/document-types and the assistant uses it to build its prompts.
"""

from typing import Literal, Optional

from pydantic import BaseModel

FieldType = Literal["text", "textarea", "date"]


class DocField(BaseModel):
    """One fillable cover-page field."""

    key: str
    label: str
    section: str
    type: FieldType = "text"
    hint: Optional[str] = None
    placeholder: Optional[str] = None


class Section(BaseModel):
    """A group of fields. Party sections also render a signature block."""

    name: str
    is_party: bool = False


class DocumentType(BaseModel):
    id: str
    name: str
    short_name: str
    description: str
    engine: Literal["mnda", "generic"]
    standard_terms_label: str
    standard_terms_url: str
    sections: list[Section]
    fields: list[DocField]


def _party(prefix: str, section: str) -> list[DocField]:
    """The standard signatory fields for a party section."""
    return [
        DocField(
            key=f"{prefix}Company",
            label="Company",
            section=section,
            hint="Legal entity name",
            placeholder="Acme, Inc.",
        ),
        DocField(
            key=f"{prefix}SignerName",
            label="Signer Name",
            section=section,
            placeholder="Jane Doe",
        ),
        DocField(
            key=f"{prefix}SignerTitle",
            label="Signer Title",
            section=section,
            placeholder="CEO",
        ),
        DocField(
            key=f"{prefix}NoticeAddress",
            label="Notice Address",
            section=section,
            type="textarea",
            hint="Email or postal address for legal notices",
        ),
    ]


def _common_close() -> list[DocField]:
    """Governing law and jurisdiction, shared by every generic type."""
    return [
        DocField(
            key="governingLaw",
            label="Governing Law (state)",
            section="Agreement",
            hint="The U.S. state whose law governs",
            placeholder="Delaware",
        ),
        DocField(
            key="chosenCourts",
            label="Chosen Courts (jurisdiction)",
            section="Agreement",
            hint="Where disputes are heard",
            placeholder="New Castle, DE",
        ),
    ]


def _effective_date() -> DocField:
    return DocField(key="effectiveDate", label="Effective Date", section="Agreement", type="date")


# Ten generic document types. The MNDA is appended separately below.
_GENERIC: list[DocumentType] = [
    DocumentType(
        id="csa",
        name="Cloud Service Agreement (CSA)",
        short_name="Cloud Service Agreement",
        description="For vendors providing cloud-based software or services to customers.",
        engine="generic",
        standard_terms_label="Common Paper Cloud Service Agreement Standard Terms (Version 2.1)",
        standard_terms_url="https://commonpaper.com/standards/cloud-service-agreement/2.1/",
        sections=[Section(name="Agreement"), Section(name="Provider", is_party=True), Section(name="Customer", is_party=True)],
        fields=[
            _effective_date(),
            DocField(key="cloudService", label="Cloud Service", section="Agreement", type="textarea", hint="What the cloud service provides"),
            DocField(key="subscriptionPeriod", label="Subscription Period", section="Agreement", hint="e.g. 12 months, auto-renewing", placeholder="12 months"),
            DocField(key="fees", label="Fees", section="Agreement", type="textarea", hint="Pricing and payment process"),
            DocField(key="generalCapAmount", label="General Liability Cap", section="Agreement", hint="e.g. fees paid in the prior 12 months"),
            *_common_close(),
            *_party("provider", "Provider"),
            *_party("customer", "Customer"),
        ],
    ),
    DocumentType(
        id="design-partner-agreement",
        name="Design Partner Agreement",
        short_name="Design Partner Agreement",
        description="For early-stage companies collaborating with a design partner on product development.",
        engine="generic",
        standard_terms_label="Common Paper Design Partner Agreement Standard Terms",
        standard_terms_url="https://commonpaper.com/standards/",
        sections=[Section(name="Agreement"), Section(name="Provider", is_party=True), Section(name="Partner", is_party=True)],
        fields=[
            _effective_date(),
            DocField(key="product", label="Product", section="Agreement", type="textarea", hint="The product the partner gets early access to"),
            DocField(key="term", label="Term", section="Agreement", hint="Length of the program", placeholder="6 months"),
            DocField(key="fees", label="Fees", section="Agreement", hint="Fees, if any; 'None' if free", placeholder="None"),
            *_common_close(),
            *_party("provider", "Provider"),
            *_party("partner", "Partner"),
        ],
    ),
    DocumentType(
        id="sla",
        name="Service Level Agreement (SLA)",
        short_name="Service Level Agreement",
        description="An attachment defining uptime, support, and service credits for a cloud service.",
        engine="generic",
        standard_terms_label="Common Paper Service Level Agreement Standard Terms (Version 2.0)",
        standard_terms_url="https://commonpaper.com/standards/service-level-agreement/2.0/",
        sections=[Section(name="Agreement"), Section(name="Provider", is_party=True), Section(name="Customer", is_party=True)],
        fields=[
            _effective_date(),
            DocField(key="cloudService", label="Cloud Service", section="Agreement", hint="The cloud service this SLA covers"),
            DocField(key="uptimeCommitment", label="Uptime Commitment", section="Agreement", hint="e.g. 99.9% monthly uptime", placeholder="99.9%"),
            DocField(key="supportResponseTimes", label="Support Response Times", section="Agreement", type="textarea", hint="Support tiers and target response times"),
            DocField(key="serviceCredits", label="Service Credits", section="Agreement", type="textarea", hint="Credits owed when targets are missed"),
            *_common_close(),
            *_party("provider", "Provider"),
            *_party("customer", "Customer"),
        ],
    ),
    DocumentType(
        id="psa",
        name="Professional Services Agreement (PSA)",
        short_name="Professional Services Agreement",
        description="Covers scoped professional or consulting services delivered to a customer.",
        engine="generic",
        standard_terms_label="Common Paper Professional Services Agreement Standard Terms",
        standard_terms_url="https://commonpaper.com/standards/",
        sections=[Section(name="Agreement"), Section(name="Provider", is_party=True), Section(name="Customer", is_party=True)],
        fields=[
            _effective_date(),
            DocField(key="services", label="Services", section="Agreement", type="textarea", hint="Description of the services (SOW summary)"),
            DocField(key="deliverables", label="Deliverables", section="Agreement", type="textarea", hint="Key deliverables, if any"),
            DocField(key="fees", label="Fees", section="Agreement", type="textarea", hint="Fees and payment period"),
            DocField(key="generalCapAmount", label="General Liability Cap", section="Agreement", hint="e.g. fees paid in the prior 12 months"),
            *_common_close(),
            *_party("provider", "Provider"),
            *_party("customer", "Customer"),
        ],
    ),
    DocumentType(
        id="dpa",
        name="Data Processing Agreement (DPA)",
        short_name="Data Processing Agreement",
        description="A GDPR/CCPA addendum for personal data processing between controller and processor.",
        engine="generic",
        standard_terms_label="Common Paper Data Processing Agreement Standard Terms",
        standard_terms_url="https://commonpaper.com/standards/",
        sections=[
            Section(name="Agreement"),
            Section(name="Provider (Processor)", is_party=True),
            Section(name="Customer (Controller)", is_party=True),
        ],
        fields=[
            _effective_date(),
            DocField(key="underlyingAgreement", label="Underlying Agreement", section="Agreement", hint="The agreement this DPA supplements"),
            DocField(key="natureAndPurpose", label="Nature & Purpose of Processing", section="Agreement", type="textarea"),
            DocField(key="categoriesOfDataSubjects", label="Categories of Data Subjects", section="Agreement", type="textarea", hint="e.g. customers, employees"),
            DocField(key="categoriesOfPersonalData", label="Categories of Personal Data", section="Agreement", type="textarea", hint="e.g. names, emails, usage data"),
            DocField(key="durationOfProcessing", label="Duration of Processing", section="Agreement", hint="e.g. the term of the underlying agreement"),
            *_common_close(),
            *_party("provider", "Provider (Processor)"),
            *_party("customer", "Customer (Controller)"),
        ],
    ),
    DocumentType(
        id="software-license-agreement",
        name="Software License Agreement",
        short_name="Software License Agreement",
        description="For licensing on-premise or downloadable software to a customer.",
        engine="generic",
        standard_terms_label="Common Paper Software License Agreement Standard Terms (Version 1.1)",
        standard_terms_url="https://commonpaper.com/standards/software-license-agreement/1.1/",
        sections=[Section(name="Agreement"), Section(name="Provider", is_party=True), Section(name="Customer", is_party=True)],
        fields=[
            _effective_date(),
            DocField(key="software", label="Software", section="Agreement", type="textarea", hint="The licensed software"),
            DocField(key="licenseScope", label="License Scope", section="Agreement", type="textarea", hint="Users, sites, and any restrictions"),
            DocField(key="term", label="License Term", section="Agreement", hint="e.g. perpetual or 1 year", placeholder="1 year"),
            DocField(key="fees", label="Fees", section="Agreement", type="textarea", hint="License fees and payment"),
            *_common_close(),
            *_party("provider", "Provider"),
            *_party("customer", "Customer"),
        ],
    ),
    DocumentType(
        id="partnership-agreement",
        name="Partnership Agreement",
        short_name="Partnership Agreement",
        description="Governs referral, reseller, or other commercial partnerships between two companies.",
        engine="generic",
        standard_terms_label="Common Paper Partnership Agreement Standard Terms (Version 1.0)",
        standard_terms_url="https://commonpaper.com/standards/partnership-agreement/1.0",
        sections=[Section(name="Agreement"), Section(name="Provider", is_party=True), Section(name="Partner", is_party=True)],
        fields=[
            _effective_date(),
            DocField(key="partnershipType", label="Partnership Type", section="Agreement", hint="e.g. referral, reseller", placeholder="referral"),
            DocField(key="scope", label="Scope", section="Agreement", type="textarea", hint="What each party will do"),
            DocField(key="term", label="Term", section="Agreement", hint="Length of the partnership", placeholder="1 year"),
            DocField(key="feesOrCommission", label="Fees or Commission", section="Agreement", type="textarea", hint="Fees, revenue share, or commission"),
            *_common_close(),
            *_party("provider", "Provider"),
            *_party("partner", "Partner"),
        ],
    ),
    DocumentType(
        id="pilot-agreement",
        name="Pilot Agreement",
        short_name="Pilot Agreement",
        description="For time-bound product pilots or proofs of concept between a vendor and a customer.",
        engine="generic",
        standard_terms_label="Common Paper Pilot Agreement Standard Terms (Version 1.1)",
        standard_terms_url="https://commonpaper.com/standards/pilot-agreement/1.1",
        sections=[Section(name="Agreement"), Section(name="Provider", is_party=True), Section(name="Customer", is_party=True)],
        fields=[
            _effective_date(),
            DocField(key="product", label="Product", section="Agreement", type="textarea", hint="The product being piloted"),
            DocField(key="pilotPeriod", label="Pilot Period", section="Agreement", hint="Length of the pilot", placeholder="60 days"),
            DocField(key="evaluationPurposes", label="Evaluation Purposes", section="Agreement", type="textarea", hint="What the customer is evaluating"),
            DocField(key="fees", label="Fees", section="Agreement", hint="Fees, if any; 'None' if free", placeholder="None"),
            DocField(key="generalCapAmount", label="General Liability Cap", section="Agreement", hint="e.g. fees paid, or a fixed amount"),
            *_common_close(),
            *_party("provider", "Provider"),
            *_party("customer", "Customer"),
        ],
    ),
    DocumentType(
        id="baa",
        name="Business Associate Agreement (BAA)",
        short_name="Business Associate Agreement",
        description="A HIPAA-required addendum for vendors handling Protected Health Information.",
        engine="generic",
        standard_terms_label="Common Paper Business Associate Agreement Standard Terms (Version 1.0)",
        standard_terms_url="https://commonpaper.com/standards/business-associate-agreement/1.0",
        sections=[
            Section(name="Agreement"),
            Section(name="Covered Entity", is_party=True),
            Section(name="Business Associate", is_party=True),
        ],
        fields=[
            _effective_date(),
            DocField(key="underlyingAgreement", label="Underlying Agreement", section="Agreement", hint="The agreement this BAA supports"),
            DocField(key="permittedUses", label="Permitted Uses & Disclosures", section="Agreement", type="textarea", hint="How PHI may be used and disclosed"),
            *_common_close(),
            *_party("coveredEntity", "Covered Entity"),
            *_party("businessAssociate", "Business Associate"),
        ],
    ),
    DocumentType(
        id="ai-addendum",
        name="AI Addendum",
        short_name="AI Addendum",
        description="Supplements an agreement to address use, input, output, and restrictions for AI-powered services.",
        engine="generic",
        standard_terms_label="Common Paper AI Addendum Standard Terms (Version 1.0)",
        standard_terms_url="https://commonpaper.com/standards/ai-addendum/1.0/",
        sections=[Section(name="Agreement"), Section(name="Provider", is_party=True), Section(name="Customer", is_party=True)],
        fields=[
            _effective_date(),
            DocField(key="underlyingAgreement", label="Underlying Agreement", section="Agreement", hint="The agreement this AI Addendum supplements"),
            DocField(key="aiServices", label="AI Services", section="Agreement", type="textarea", hint="The AI-powered services covered"),
            DocField(key="trainingPermitted", label="Model Training Permitted?", section="Agreement", hint="May the provider train models on your data? Yes/No", placeholder="No"),
            DocField(key="trainingPurposes", label="Training Purposes", section="Agreement", type="textarea", hint="If training is permitted, the allowed purposes"),
            *_common_close(),
            *_party("provider", "Provider"),
            *_party("customer", "Customer"),
        ],
    ),
]

# The MNDA is supported but handled by its bespoke creator; it carries no
# generic fields. Listed so the picker and triage can route to it.
_MNDA = DocumentType(
    id="mnda",
    name="Mutual Non-Disclosure Agreement (MNDA)",
    short_name="Mutual NDA",
    description="Used by two parties to exchange confidential information for a defined purpose.",
    engine="mnda",
    standard_terms_label="Common Paper Mutual NDA Standard Terms (Version 1.0)",
    standard_terms_url="https://commonpaper.com/standards/mutual-nda/1.0",
    sections=[],
    fields=[],
)

DOCUMENT_TYPES: list[DocumentType] = [_MNDA, *_GENERIC]

_BY_ID: dict[str, DocumentType] = {d.id: d for d in DOCUMENT_TYPES}


def get_document_type(doc_id: str) -> Optional[DocumentType]:
    return _BY_ID.get(doc_id)
