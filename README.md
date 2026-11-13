# ntell.ai

The company site for ntell, an AI transformation company working across
financial services, government, FMCG and consumer, and M&A and value creation.

A static, scroll-driven single page. No framework and no build step: serve the
folder with any web server and it runs.

## Run locally

```bash
python3 -m http.server 4173
```

Then open http://127.0.0.1:4173/. It must be served over HTTP, not opened as a
file, so that the fonts and the logo animation load.

## Structure

```
index.html              All content and markup
css/fonts.css           Self-hosted font faces
css/style.css           Design tokens and every section's styles
js/main.js              Motion layer (see below)
assets/brand/           Signal-orb logo kit (SVG) and favicons
assets/video/           Opening logo sting (MP4 and WebM)
assets/img/             AVA character cut-outs and the share image
assets/fonts/           Newsreader, Stack Sans Headline, Stack Sans Text, JetBrains Mono
assets/vendor/          GSAP 3.13 (core, ScrollTrigger, SplitText) and Lenis 1.3
```

## Page outline

1. Hero: "We build the AI-native enterprise", with the signal orb in its field
2. Who we are: one partner for AI transformation, mission and values
3. What we do: advise, build, equip, embed
4. Industries, one chapter each, with the capabilities and what we bring to
   them (a solid tag names an ntell product, an outlined tag is bespoke work):
   - Fintech and financial services (payments, core banking, fraud, risk,
     modelling, decisioning, reporting, data sharing, AI governance), with the
     Portfolio 360°, Model Studio and Arbiter product gallery inside it
   - Government services
   - FMCG and consumer
   - M&A and value creation
   - AI transformation
5. What is changing, and the gap
6. How we work: bespoke deployment, strategic partnership, change management
7. How we engage: five stages
8. How we deliver, and where we operate
9. Team (placeholders) and contact

## Design language

An off-white page with an editorial serif (Newsreader) for statements and
Stack Sans for everything you read and use. The palette comes from the logo:
ink, crimson and a deep maroon for the dark panels. Product screens in the
gallery keep their own colours. Tokens live at the top of `css/style.css`.

## Motion

Everything is progressive. With reduced motion requested the page is complete
and static. With JavaScript off it is readable from top to bottom with a solid
nav; the two scenes that only exist as script (the organisation chart and the
adoption dots) are left out.

- **Opening sting**: the supplied logo animation plays on every load, then the
  page lifts in. "Skip intro" or Escape ends it early; it is skipped on its own
  only if the video cannot start within a moment.
- **The signal orb**: the logo's orb, drawn as a real sphere on a canvas so its
  six-circle pattern turns in 3D. It sits large in the hero, rolls with the
  scroll, lands on the full stop of each chapter heading, rides a rail at the
  page edge between them, passes through the five stages, and ends as the dot
  of the footer wordmark. Any element with `data-orb` is an anchor, in document
  order.
- **The field**: canvas, on one fixed layer behind the whole page so no section
  edge ever cuts it. The orb sits in a field of lines the way a pole sits in a
  magnetic field: lines are drawn into it, a few leave the far side, the rest
  sweep round it. Every line is a streamline of one smooth field, retraced on
  each frame, so nothing jumps. The field leans with the scroll and settles
  like a compass needle, shrinks with the orb as it rolls away, and parts
  round the pointer as it would round a second pole.
- **Hero interactions**: drag the orb to spin it (mouse or touch, with
  momentum); move over the lines to bend them; press and hold to push them
  further apart; tap the orb to make the whole field ring.
- **What is changing**: a pinned canvas scene where a layered organisation
  chart reorganises into small teams with agent rings.
- **How we work**: sticky stacking cards. **Industries**: each chapter heading
  stays put while its rows come in beside it; the financial services chapter
  holds a pinned horizontal gallery with three animated product screens.
  **How we engage**: a vertical timeline that the orb travels down.

## Editing content

- Text is plain HTML in `index.html`, one commented block per section.
- **Team**: replace the `[ Name ]` / `[ Role ]` placeholders in the
  `<ul class="team__grid">` block. Add a photo by putting an `<img>` inside
  `.member__pic`.
- **Contact**: the phone and office-address placeholders are marked with the
  `ph` class in the contact section and in the footer.
- **Industries**: each chapter is an `<article class="chapter">`; a capability
  is one `<li class="row">` with a heading, a line of text and a tag. The tag
  names the ntell product that covers it, or uses `tag--plain` for bespoke work.
- Product screens in the financial services gallery use demo data and are
  labelled as such.

## Deploy

Any static host works (Vercel, GitHub Pages, Netlify, Cloudflare Pages, S3).
There is nothing to build: publish the repository root as it is.

- **Vercel**: import this repository as a new project. Framework preset
  "Other", no build command, output directory left empty. Every push to `main`
  then deploys.
- **GitHub Pages**: a workflow is included at `.github/workflows/pages.yml`.
  Enable Pages with the "GitHub Actions" source and every push to `main`
  deploys.

To serve it on the ntell.ai domain, add the custom domain in the host's
settings and point DNS at it.

## Licences

GSAP is used under its standard no-charge licence. Lenis is MIT. The fonts are
under the SIL Open Font License.
