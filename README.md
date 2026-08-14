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
        ├── index.html               # The form
        ├── styles.css               # Form-specific styles
        └── app.js                   # Form logic + the TTPFormFiller API
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
| **2** | A TTP agent with a **client tool** that fills the form field by field as the user speaks. | ⏳ Next |
| **3** | Fill the whole form **by voice**, submit by voice, and show on screen exactly what was sent. | ⏳ Planned |

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
