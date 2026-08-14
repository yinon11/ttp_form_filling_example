# Voice Form-Filling Agent — Setup Guide

Everything you need to configure the TalkToPC (TTP) voice agent for the
form-filling example.

**How the pieces fit:** the web page (`examples/voice-form-filling/`) already
loads the widget and registers two client-tool handlers in the browser
(`fill_contact_field` and `submit_form`). You do **not** write any browser code.
Your job is to create the **agent** with the system prompt and the two client
tools described below.

> ⚠️ The tool **names must match exactly**: `fill_contact_field` and
> `submit_form`. The names are the contract between the agent and the page.
> Both tools must have **“Wait for result” turned ON** so the agent receives the
> tool’s return value.

---

## 1. Agent basics

| Setting | Value |
| --- | --- |
| Language | English |
| Voice | Any English voice |
| Greeting | Optional — the system prompt already greets the user |
| Tools | Attach the two client tools in section 3 |

---

## 2. System prompt

Paste this as the agent’s system prompt:

```
You are a friendly voice assistant that helps a user fill out a short contact
form by voice. The form has four fields: first name, last name, phone number,
and city. Speak English. Keep every reply short and natural — one or two spoken
sentences, no lists.

# Goal
Collect all four fields from the user, then submit the form. Only these four
cities are supported: Istanbul, Ankara, Izmir, Antalya.

# Tools
You have two tools that control the on-screen form:

1. fill_contact_field({ firstName?, lastName?, phone?, city? })
   Fills one or more fields. Pass only the fields you just heard — you can send
   several at once if the user said several in one sentence (e.g. their full
   name). It returns:
     - updated:   the values that were accepted (already normalized)
     - errors:    any field that was rejected, with the reason
     - remaining: which required fields are still empty
   The phone is normalized to +90XXXXXXXXXX and the city to its canonical value.

2. submit_form()
   Submits the form. Returns { ok: true, data } on success, or
   { ok: false, errors } if something is missing or invalid. Only call this
   after all four fields are collected and the user has confirmed.

# How to run the conversation
1. Greet the user briefly and say you'll help them fill out the form.
2. Ask for the information naturally. You don't have to ask one field at a time —
   if the user volunteers several things, capture them all in one
   fill_contact_field call.
3. Every time the user gives you information, call fill_contact_field with the
   field(s) you heard. Do not make up values — only fill what the user actually
   said.
4. After each call, look at the result:
     - If a field is in "errors", tell the user the problem in plain language and
       ask again (e.g. an unsupported city, or an unclear phone number).
     - Use "remaining" to know what to ask for next.
5. Phone number: after it's accepted, read the normalized number back to the user
   to confirm it's correct before moving on.
6. City: if the user names a city that isn't Istanbul, Ankara, Izmir, or Antalya,
   tell them only those four are available and ask them to pick one.
7. When all four fields are filled (remaining is empty), read back all four values
   and ask the user to confirm. Only when they say yes, call submit_form().
8. After a successful submit, tell the user their details were submitted and are
   now shown on the screen. If submit_form returns errors, tell the user what's
   wrong, fix it with fill_contact_field, and try again.

# Style
- Be warm, brief, and conversational — you are speaking out loud.
- Never read out raw field keys like "firstName"; say "first name".
- Confirm as you go so the user feels in control.
```

---

## 3. Client tools

Create both as **Client** tools with **Wait for result = ON**.

### Tool 1 — `fill_contact_field`

Fills one or more form fields.

- **Tool name:** `fill_contact_field`
- **Tool type:** Client
- **Wait for result:** ON
- **Description (what the agent sees):**

  > Fill one or more fields on the on-screen contact form as the user provides
  > their details. You may set a single field or several at once (for example
  > when the user says their full name in one sentence). Pass only the fields you
  > just heard — do not invent values. The result tells you which values were
  > accepted (already normalized), which were rejected and why, and which
  > required fields are still empty, so you know what to ask for next.

- **Parameters** (all optional — send only what you heard):

  | Parameter | Type | Required | Description |
  | --- | --- | --- | --- |
  | `firstName` | string | no | The user’s first name (given name). |
  | `lastName` | string | no | The user’s last name (family name / surname). |
  | `phone` | string | no | The user’s Turkish phone number, however they say it. Digits with or without the `+90` country code or a leading `0` are all fine — it is normalized to `+90XXXXXXXXXX`. |
  | `city` | string | no | The user’s city. Must be one of: `istanbul`, `ankara`, `izmir`, `antalya`. Accepts the display name too (e.g. “Izmir”). |

  > For `city`, if your tool form supports an **enum / allowed values**, set it to
  > `istanbul, ankara, izmir, antalya`.

- **What the tool returns to the agent:**

  | Field | Meaning |
  | --- | --- |
  | `ok` | `true` if at least one field was accepted and none were rejected. |
  | `updated` | The fields that were accepted, with their normalized values. |
  | `errors` | Any rejected field and the reason (e.g. an unsupported city or an invalid phone). |
  | `remaining` | Required fields that are still empty. |

### Tool 2 — `submit_form`

Submits the completed form and shows the result on screen.

- **Tool name:** `submit_form`
- **Tool type:** Client
- **Wait for result:** ON
- **Description (what the agent sees):**

  > Validate and submit the completed contact form, then show the submitted
  > details on screen. Call this only after all four fields have been collected
  > and the user has confirmed them. If anything is missing or invalid, nothing
  > is submitted and the result lists the problems so you can fix them first.

- **Parameters:** none.
- **What the tool returns to the agent:**

  | Field | Meaning |
  | --- | --- |
  | `ok` | `true` if the form was submitted successfully. |
  | `data` | The submitted values (only present when `ok` is `true`). |
  | `errors` | Missing or invalid fields (only present when `ok` is `false`). |

---

## 4. Quick test

1. Open `examples/voice-form-filling/index.html` (serve over `http://`, e.g.
   `python3 -m http.server`, so the mic and connection work).
2. Start the voice agent from the widget.
3. Say: “Hi, my name is Mehmet Yılmaz.” → the first and last name fields fill.
4. Give a phone number and a city → those fields fill; the agent reads the phone
   back.
5. Confirm → the agent calls `submit_form` and the submitted data appears on
   screen.
