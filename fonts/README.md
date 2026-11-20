# Self-hosted font sources

Unmodified TrueType font files from the official Google Fonts repository:
https://github.com/google/fonts/tree/main/ofl

| File | Family | Role | Upstream folder | License |
| --- | --- | --- | --- | --- |
| bungee.ttf | Bungee | Provisional display recommendation | bungee | bungee-OFL.txt |
| rubik-mono-one.ttf | Rubik Mono One | Display alternative, styleguide only | rubikmonoone | rubikmonoone-OFL.txt |
| archivo-black.ttf | Archivo Black | Display alternative, styleguide only | archivoblack | archivoblack-OFL.txt |
| space-grotesk.ttf | Space Grotesk | Body, variable weight | spacegrotesk | spacegrotesk-OFL.txt |
| ibm-plex-mono.ttf | IBM Plex Mono | Prices, dates, catalogue numbers | ibmplexmono | ibmplexmono-OFL.txt |

All five are licensed under the SIL Open Font License 1.1. Distribute each font
with its included copyright/license notice. Font files are unmodified; the local
filenames were shortened for consistent asset URLs. The upstream Space Grotesk
filename is `SpaceGrotesk[wght].ttf`; the others are the regular TTFs.

These files are intended for your public firelight-assets repository. Production
theme.js registers the three active families using the single ASSET_BASE. The
preview styleguide loads all five directly from the local `/assets/fonts/` mirror.
There are no Google Fonts requests or new external font services at runtime.

## Shell separator fallback

`noto-sans-symbols-2-shell.ttf` is Google's 5.5 KB TrueType subset of
**Noto Sans Symbols 2**, requested for `⦿` (U+29BF) only:
https://fonts.googleapis.com/css2?family=Noto+Sans+Symbols+2&text=%E2%A6%BF

Its upstream family is `ofl/notosanssymbols2` in the Google Fonts repository;
`notosanssymbols2-OFL.txt` accompanies it. The file retains its internal font
name. This small subset is self-hosted, not fetched from Google at runtime.
The theme registers it as `Firelight Symbols` with `unicodeRange: U+29BF`;
Bungee remains the display face, including its native `→` and `Ń` glyphs.

## Worn Worldwide captions

`caveat-*.woff2` are the official variable-weight Caveat webfont subsets
for Latin and Cyrillic. They come from the Google Fonts
[`Caveat:wght@400..700` stylesheet](https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap).
Keep `caveat-OFL.txt` with these files. The theme loads the needed subsets
from its own `ASSET_BASE`, only for Worn Worldwide captions.
