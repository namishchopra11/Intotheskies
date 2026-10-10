# JetFlex photo slots

JetFlex ships with built-in illustrations for every photo slot, so the app looks finished with
no photos at all. Real photography is optional and drops in without code changes.

## What to add

Save each file in this folder with exactly this name (JPG, landscape, at least 2000 px wide,
ideally under 600 KB after export):

| File | Shot | Used for |
| --- | --- | --- |
| `jet-apron.jpg` | A private jet on an apron, dusk or golden hour, with open space on the left third (text sits there) | Overview hero background |
| `cabin-interior.jpg` | Private jet cabin: club seats, table, warm light | Overview tile, My Cabin |
| `runway-dusk.jpg` | Runway or taxiway at dusk with edge lights | Overview tile, empty legs |
| `miami-skyline.jpg` | Miami skyline over water, sunset or blue hour | Overview tile, Miami demo trip |

Avoid photos with legible tail numbers, airline or operator liveries, or recognisable people:
this demo is not affiliated with any operator, and releases are rarely included.

## How to register a photo

1. Put the file here.
2. Open `credits.json`, find the entry, and set `"added": true` and `"status": "added"`.
3. Fill in `photographer`, `sourceUrl` (the page you got it from) and `licence`
   (for example `"Unsplash License"` or `"Pexels License"`).

The credit line on the page is generated from those three fields, so they must be filled in
before you publish. Until `"added"` is `true` nothing is requested from the server, so a
missing file never produces a broken image.

## Licence-friendly sources

- **Unsplash** (https://unsplash.com): the Unsplash License allows free commercial and
  non-commercial use without permission; attribution is appreciated and this app shows it.
  Search "private jet", "jet cabin", "runway dusk", "Miami skyline".
- **Pexels** (https://www.pexels.com): the Pexels License is similar. You may not imply
  endorsement by the people or brands shown. Check each photo's own page before using it.
- Wikimedia Commons works too, but licences vary per file (CC BY needs attribution, CC BY-SA
  needs share-alike). Record the exact licence in `credits.json`.

Always download from the photo's page and keep the original photographer's name. Do not
hotlink: files must live in this folder so the app serves and optimises them itself.
