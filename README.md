# TTP Voice Examples

A small, public collection of **plain-JavaScript** examples showing how to drive
a web page with a [TalkToPC](https://talktopc.com) (TTP) voice agent — no build
step, no framework. Open any example's `index.html` in a browser and it just
runs.

The first example is **voice form filling**: a contact form that a voice agent
fills in field by field and submits — hands-free.

## Repository layout

```
.
├── index.html                       # Gallery — links to every example
├── shared/
│   └── base.css                     # Shared neutral design tokens/styles
└── examples/
    └── voice-form-filling/
        ├── index.html               # The form + widget + registered client tools
        ├── styles.css               # Form-specific styles
        ├── app.js                   # Form logic + the TTPFormFiller API
        └── AGENT_SETUP.md           # How to configure the voice agent (prompt + tools)
```

Each example is self-contained inside its own folder under `examples/`. To add a
new example, create a folder there and add a card to the root `index.html`.

## Running it

No server or install needed — just open the file:

```bash
# from the repo root, either open directly…
open index.html                      # macOS
# …or serve it (recommended so relative paths behave everywhere)
python3 -m http.server 8000          # then visit http://localhost:8000
```

## The three phases

This example is built in three phases. **Phase 1 is done**; 2 and 3 build on the
exact same `app.js` API.

| Phase | What it adds | Status |
| ----- | ------------ | ------ |
| **1** | The plain form: first name, last name, phone, city (dropdown), light validation, and an on-screen "submitted data" panel. | ✅ Done |
| **2** | The voice widget + two **client tools** (`fill_contact_field`, `submit_form`) registered on the page so the agent can fill the form field by field. | ✅ Done |
| **3** | Fill the whole form **by voice**, submit by voice, and show on screen exactly what was sent. | ✅ Done |

> Phases 2 & 3 are wired up in the browser. To make them run you configure a TTP
> agent (system prompt + the two tools) — see
> **[Setting up the voice agent](#setting-up-the-voice-agent)** below.

## Setting up the voice agent

The form page ([`examples/voice-form-filling/index.html`](examples/voice-form-filling/index.html))
already loads the TTP widget and registers two **client tools** in the browser —
you don't write any browser code for the agent:

| Tool | What it does |
| ---- | ------------ |
| `fill_contact_field({ firstName?, lastName?, phone?, city? })` | Fills one or more fields (the user may say several in one sentence). Returns what was accepted (normalized), what was rejected and why, and which fields are still empty. |
| `submit_form()` | Submits the form and shows the result on screen. |

To make it work, create a TTP agent with the matching system prompt and tool
definitions. The full, paste-ready details are in
**[`AGENT_SETUP.md`](examples/voice-form-filling/AGENT_SETUP.md)**:

- Agent basics (English, voice, attach both tools with **Wait for result = ON**)
- The complete **system prompt**
- Both **tool definitions** (parameters + return shapes, as readable tables)
- A quick test walkthrough

> The tool **names are the contract** — the agent's tools must be named exactly
> `fill_contact_field` and `submit_form` to match the handlers registered on the
> page.

## How the form is driven: `window.TTPFormFiller`

The important design choice: the form is **never poked directly** by the voice
integration. Everything goes through one small public API defined in
[`examples/voice-form-filling/app.js`](examples/voice-form-filling/app.js). That
is what makes phases 2 and 3 a drop-in — the voice client tool never needs to
know the HTML.

```js
// Fill one field (this is what the voice client tool calls in phase 2):
TTPFormFiller.setField("firstName", "Mehmet");
// => { ok: true, name: "firstName", value: "Mehmet", error: "" }

// Fill several at once:
TTPFormFiller.setFields({
  firstName: "Mehmet",
  lastName: "Yılmaz",
  phone: "0532 123 45 67",   // normalised to +905321234567
  city: "izmir",             // accepts "Izmir" / "izmir"
});

// Read what's currently in the form:
TTPFormFiller.getData();
// => { firstName: "Mehmet", lastName: "Yılmaz", phone: "+905321234567", city: "izmir" }

// Validate everything (also paints inline errors):
TTPFormFiller.validate();
// => { valid: true, errors: {} }

// Submit — validates, then renders the data on screen (phase 3 calls this):
TTPFormFiller.submit();
// => { ok: true, data: {...}, errors: {} }

// Start over:
TTPFormFiller.reset();
```

You can try all of the above from the browser devtools console on the form page.

### Fields

| Key | Control | Notes |
| --- | ------- | ----- |
| `firstName` | text | required |
| `lastName` | text | required |
| `phone` | tel | required; normalised & validated as a Turkish number (`+90` + 10 digits). Accepts `0532…`, `+90 532…`, `905321234567`, etc. |
| `city` | select | required; one of `istanbul`, `ankara`, `izmir`, `antalya` (accepts the display name too, case-insensitive) |

When `setField` fills a control it briefly flashes it, so during voice filling
you can watch the agent complete the form one field at a time.

## License

Public example, provided as-is for integration reference.
