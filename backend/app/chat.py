"""AI chat that drives Mutual NDA field collection (PL-5).

A freeform conversation with the user replaces the static question form. Each
turn the model returns its next message plus the MNDA fields it has extracted so
far. The call goes through LiteLLM -> OpenRouter -> Cerebras (gpt-oss-120b) using
Structured Outputs so the result maps directly onto the cover-page fields.
"""

import json
from datetime import date
from typing import Literal, Optional

from litellm import completion
from pydantic import BaseModel, Field

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}


class ExtractedParty(BaseModel):
    """A signing party. Every field is nullable until the user provides it."""

    printName: Optional[str]
    title: Optional[str]
    company: Optional[str]
    noticeAddress: Optional[str]


class ExtractedMnda(BaseModel):
    """MNDA cover-page fields, mirroring the frontend schema.

    All fields are nullable so the model can fill them in incrementally; the
    frontend merges only non-null values so a null never clears a known field.
    """

    purpose: Optional[str]
    effectiveDate: Optional[str]
    mndaTermKind: Optional[Literal["years", "untilTerminated"]]
    mndaTermYears: Optional[int]
    termOfConfidentialityKind: Optional[Literal["years", "perpetuity"]]
    termOfConfidentialityYears: Optional[int]
    governingLawState: Optional[str]
    jurisdiction: Optional[str]
    modifications: Optional[str]
    party1: ExtractedParty
    party2: ExtractedParty


class ChatResult(BaseModel):
    """The model's structured response: a reply plus extracted fields."""

    reply: str
    fields: ExtractedMnda


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    fields: dict = Field(default_factory=dict)


SYSTEM_PROMPT = """\
You are a friendly legal assistant helping a user complete a Common Paper Mutual \
Non-Disclosure Agreement (MNDA) through conversation.

Your job:
- Have a natural, freeform conversation. Ask about the agreement and the people \
and companies involved.
- Ask for missing information one or two items at a time. Do not overwhelm the \
user by asking for everything at once.
- From the entire conversation, extract values for the MNDA fields and return \
them in the `fields` object.
- For any field you do not yet know, return null. Never invent values.
- When you have everything, let the user know the agreement is ready to download.
- If any required information is still missing, you MUST end your reply with a \
single clear question asking for the next item you need. Only omit a question \
once everything is filled in.

Today's date is {today}. Interpret relative dates (e.g. "today", "next Monday") \
accordingly and always output dates as YYYY-MM-DD.

The MNDA fields:
- purpose: why confidential information is being shared (a sentence).
- effectiveDate: when the MNDA takes effect (YYYY-MM-DD).
- mndaTermKind: "years" (the MNDA lasts a fixed number of years) or \
"untilTerminated" (continues until a party terminates).
- mndaTermYears: number of years, only when mndaTermKind is "years".
- termOfConfidentialityKind: "years" (confidentiality lasts a fixed number of \
years) or "perpetuity" (forever).
- termOfConfidentialityYears: number of years, only when \
termOfConfidentialityKind is "years".
- governingLawState: the U.S. state whose law governs (e.g. "Delaware").
- jurisdiction: the courts/venue for disputes (e.g. "New Castle, DE").
- modifications: any changes to the standard terms; "None" if there are none.
- party1 and party2: each has printName (the signer's name), title (the signer's \
job title), company (the legal entity name), and noticeAddress (email or postal \
address for legal notices).

The `reply` field is your next message to the user. Keep it concise, warm, and \
conversational.

Field values collected so far (null means still unknown):
{fields}
"""


def _build_messages(history: list[ChatMessage], current_fields: dict) -> list[dict]:
    system = SYSTEM_PROMPT.format(
        today=date.today().isoformat(),
        fields=json.dumps(current_fields, indent=2),
    )
    turns = [{"role": m.role, "content": m.content} for m in history]
    return [{"role": "system", "content": system}, *turns]


def generate_reply(history: list[ChatMessage], current_fields: dict) -> ChatResult:
    """Call the LLM and return its reply plus the extracted MNDA fields."""
    response = completion(
        model=MODEL,
        messages=_build_messages(history, current_fields),
        response_format=ChatResult,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    content = response.choices[0].message.content
    return ChatResult.model_validate_json(content)
