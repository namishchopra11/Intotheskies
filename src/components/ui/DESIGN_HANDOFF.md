# ConnectionKeeper design handoff

Quiet terminal: warm ivory, navy, restrained teal and locally hosted Public Sans. Status uses words, distinct line symbols and colour. Buttons and inputs are 48px tall; small buttons remain 44px.

## Delivered on the design branch

- Shared Button, Card, Sheet, Field, Badge, Toggle and ProgressBar, preserving the previous component API. Existing icon names, PageHeader, ThemeToggle, SelectField and TextAreaField remain available.
- Live message preview from buildSummary, booking references off by default, hotel and unfinished-task switches, native sharing, confirmed copying and a manual-copy bottom sheet when automatic copying fails.
- Snapshot links built with encodeShare at /s#data. /s uses decodeShare without reading the traveller’s local store. It shows the traveller, change, revised itinerary, hotel details when included and unfinished tasks when included.
- Empty and malformed-link screens; cancellation never presents unconfirmed replacement times. A connection with no known arrival is labelled at risk.
- Mobile viewport, page metadata, manifest, regular and maskable icons, Apple home-screen icon. No remote font requests.

## 375px review: pass this to the screen owners

1. **Screens — /**: Currently a heading only in this checkout. Finish the trip screen using the shared cards, flight status badges and buttons. The first judge-facing screen is not ready yet.
2. **Screens — /disruption/new**: Currently a heading only. Use Field/SelectField for reporting the change, and Sheet where appropriate. Keep dates/times local and gate store reads on useStoreReady.
3. **Foundation — /disruption/[id]**: The functional screen fits 375px without sideways scrolling. Adopt the shared Brand or PageHeader, Card, Badge and ProgressBar. Its connection label currently has no status symbol, its header is smaller and it uses different spacing from the share screens. Use the shared button styling for Send an update and keep that action easy to reach below the checklist.
4. **All screen owners**: Import from @/components/ui. Full API details are in src/components/ui/README.md. The existing API is preserved; both block and fullWidth work for buttons. One main teal action per screen; secondary actions use borders. Do not use colour alone for status.

I did not modify any teammate-owned source files.

## Verification and remaining checks

- Lint passed. All 31 existing tests passed.
- In the browser, Copy text matched the rendered preview. Copy link opened /s in a fresh tab. Booking codes were excluded by default; turning references on and hotel/tasks off produced the matching recipient page. Hash changes updated /s. Malformed links showed recovery copy.
- Bottom sheet opened at phone width and Escape restored focus. Cancellation showed no confirmed replacement and the onward flight at risk.
- The default Turbopack build is blocked on this machine by a local-port permission error, including outside the normal sandbox. The alternate webpack production build passed. For styled preview verification, I ran the project’s existing Tailwind loader directly before the webpack build, then restored the authored CSS. No build configuration or package files were changed. The production preview uses those correctly compiled styles.
- Actual sending to a recipient from a phone still needs a device check on the team’s HTTPS deployment. The native sharing call was reached locally; I did not send a message to anyone.
- Shared controls still need adoption in the owner-controlled screens. The above items are the remaining consistency work.
- Git push works. The connected GitHub API returns 404 for this repository and the browser is signed out; a pull request could not be opened here. Open the design-to-main comparison while signed into an account with repository access.

## Suggested pull request description

Travellers can choose which details to share and send or copy the generated travel update. Copied links open a self-contained, read-only snapshot that clearly distinguishes cancelled flights and connection risks from confirmed itinerary times.

Adds the Quiet terminal theme, compatible shared controls and home-screen assets. Validated at 375px, with clipboard/link/privacy checks, lint, 31 passing tests and a webpack production build. Default Turbopack verification remains blocked by the local environment; physical-phone sending and adoption in teammate-owned screens remain outstanding.

## Integration timing

Keep the work on `design`. Reorganize and integrate the screens after all teammates have finished their pushes, as agreed with the designer.
