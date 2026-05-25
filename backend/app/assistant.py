"""Generic AI chat that supports all document types (PL-6).

One stateless endpoint drives two phases of a single conversation:

- Triage: when no document type is chosen yet, the assistant works out which
  supported document the user needs. If they ask for something we cannot
  generate, it explains that and offers the closest supported document.
- Field collection: once a type is chosen, the assistant extracts that type's
  cover-page fields and guides the user through the rest.

The call goes through LiteLLM -> OpenRouter -> Cerebras (gpt-oss-120b) with
Structured Outputs so the reply, chosen type, and extracted fields come back in
one object. The MNDA keeps its own bespoke flow in app.chat.
"""

import json
from datetime import date
from typing import Optional

from litellm import completion
from pydantic import BaseModel, Field

from app.document_types import DOCUMENT_TYPES, get_document_type

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}


class ExtractedField(BaseModel):
    """One extracted cover-page value. value is null until the user provides it."""

    key: str
    value: Optional[str]


class AssistantResult(BaseModel):
    """The model's structured response."""

    reply: str
    documentType: Optional[str]
    fields: list[ExtractedField]


class ChatMessage(BaseModel):
    role: str
    content: str


class AssistantRequest(BaseModel):
    messages: list[ChatMessage]
    documentType: Optional[str] = None
    fields: dict = Field(default_factory=dict)


_FOLLOW_UP_RULE = (
    "If any required information is still missing, you MUST end your reply with a "
    "single clear question asking for the next item you need. Only omit a question "
    "once everything is filled in."
)


def _catalog_lines() -> str:
    return "\n".join(f'- {d.id}: {d.name} - {d.description}' for d in DOCUMENT_TYPES)


def _triage_prompt() -> str:
    return f"""\
You are a friendly legal assistant for Prelegal. Your first job is to work out \
which document the user needs from the catalog of documents we can generate.

Documents we can generate (use the id on the left):
{_catalog_lines()}

Guidance:
- Have a natural, brief conversation to understand what the user needs.
- When you are confident which document fits, set `documentType` to its id and \
confirm the choice in your reply.
- If the user asks for a document that is NOT in the catalog (for example an \
employment contract, a will, or a lease), explain that we cannot generate that \
document, then recommend the closest document we CAN generate and ask if they \
would like to use it. Do not set `documentType` until the user agrees.
- Leave `fields` as an empty list during this phase.

{_FOLLOW_UP_RULE}

The `reply` field is your next message to the user. Keep it concise and warm.
"""


def _field_lines(doc) -> str:
    lines = []
    for f in doc.fields:
        hint = f" ({f.hint})" if f.hint else ""
        lines.append(f"- {f.key} [{f.section}]: {f.label}{hint}")
    return "\n".join(lines)


def _collection_prompt(doc, current_fields: dict) -> str:
    return f"""\
You are a friendly legal assistant helping a user complete a {doc.name} through \
conversation. The user has chosen this document, so keep `documentType` set to \
"{doc.id}".

Your job:
- Ask about the agreement and the parties involved, one or two items at a time. \
Do not overwhelm the user by asking for everything at once.
- From the whole conversation, extract values for the fields below and return \
them in `fields` as a list of {{key, value}} objects. Use only these keys.
- For any field you do not yet know, return its value as null. Never invent values.
- When every field is filled, let the user know the document is ready to download.

Today's date is {date.today().isoformat()}. Interpret relative dates accordingly \
and always output dates as YYYY-MM-DD.

The fields to collect:
{_field_lines(doc)}

{_FOLLOW_UP_RULE}

The `reply` field is your next message to the user. Keep it concise, warm, and \
conversational.

Field values collected so far (null means still unknown):
{json.dumps(current_fields, indent=2)}
"""


def _build_messages(req: AssistantRequest) -> list[dict]:
    doc = get_document_type(req.documentType) if req.documentType else None
    if doc and doc.engine == "generic":
        system = _collection_prompt(doc, req.fields)
    else:
        system = _triage_prompt()
    turns = [{"role": m.role, "content": m.content} for m in req.messages]
    return [{"role": "system", "content": system}, *turns]


def generate_reply(req: AssistantRequest) -> AssistantResult:
    """Call the LLM and return its reply, chosen document type, and fields."""
    response = completion(
        model=MODEL,
        messages=_build_messages(req),
        response_format=AssistantResult,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    content = response.choices[0].message.content
    return AssistantResult.model_validate_json(content)
