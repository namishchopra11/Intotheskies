# Shared controls

Import named components from `@/components/ui`, or the individual PascalCase file.

- Button: native button props, `variant="primary|secondary|ghost|danger"`, `fullWidth`. Defaults to `type="button"`; use `type="submit"` for forms.
- Card: native div props and children.
- Sheet: `open`, `onClose`, `title`, children. Native modal dialog provides focus trapping, Escape and focus restoration. Parent controls open state.
- Field: native input props plus `label`, optional `hint` and `error`. Error and hint are linked for screen readers. Inputs stay 16px to avoid phone zoom.
- Badge: `status="on-time|warning|danger|resolved|neutral"`. Children override the default wording. Keep meaningful text; each status also has its own symbol.
- Toggle: `label`, optional `description`, `checked`, `onChange(checked)`, optional `disabled` and `id`.
- ProgressBar: `value`, optional `max` (100), `label` for screen readers.

Buttons and inputs are 48px tall; toggle targets are 52×48px. Badge is non-interactive.
Use `.ck-shell` for the page container, `.ck-stack` for section spacing, `.ck-heading` for introductions and `.ck-button ck-button-primary` on navigation Links. Tokens are in globals.css.

Existing API compatibility: Button also accepts `block`, `size`, `icon`, `href`, and exports `buttonClasses`. Card supports `as`, `padding`, `variant`. Badge also accepts `tone`, `icon`, `size` and retains FlightStatusBadge/status mappings. Field retains SelectField/TextAreaField; Sheet retains `footer`; ProgressBar retains `hideCount`/`className`. PageHeader, ThemeToggle, cx and all existing icons remain exported. Light is the default; the existing theme control can select Dark or Auto.
