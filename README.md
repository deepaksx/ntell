# ntell.ai

The company site for ntell: fintech and AI products and services, headquartered
in Dubai. Intelligent insights, smarter decisions.

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

1. Hero: tagline and the signal orb
2. Who we are: fintech and AI built as one, mission and values
3. What we do: the two disciplines
4. What is changing, and the gap
5. How we work: bespoke deployment, strategic partnership, change management
6. Where we drive value
7. Industries: financial services, government, FMCG and consumer, M&A and
   value creation, AI transformation
8. Work: Portfolio 360°, Model Studio, Arbiter
9. On the roadmap: the eight ntell products (all marked as planned)
10. How we engage: five stages
11. How we deliver, and where we operate
12. Team (placeholders) and contact

## Design language

An off-white page with an editorial serif (Newsreader) for statements and
Stack Sans for everything you read and use. The palette comes from the logo:
ink, crimson and a deep maroon for the dark panels. Product screens in the Work
section keep their own colours. Tokens live at the top of `css/style.css`.

## Motion

Everything is progressive. With JavaScript off, or with reduced motion
requested, the page is complete and static.

- **Opening sting**: the supplied logo animation plays on every load, then the
  page lifts in. It is skipped only if the video cannot start within a moment.
- **The signal orb**: the logo's orb, drawn as a real sphere on a canvas so its
  six-circle pattern turns in 3D. It sits large in the hero, rolls with the
  scroll, lands on the full stop of each chapter heading, rides a rail at the
  page edge between them, passes through the five stages, and ends as the dot
  of the footer wordmark. Any element with `data-orb` is an anchor, in document
  order.
- **Hero graphic**: canvas. Many scattered signal lines flow into the orb and
  leave as a few straight, evenly spaced ones. The lines follow the orb as it
  rolls away.
- **What is changing**: a pinned canvas scene where a layered organisation
  chart reorganises into small teams with agent rings.
- **How we work**: sticky stacking cards. **Work**: a pinned horizontal gallery
  with three animated product screens. **Roadmap**: the product stack builds
  from the foundation up. **How we engage**: a vertical timeline that the orb
  travels down.

## Editing content

- Text is plain HTML in `index.html`, one commented block per section.
- **Team**: replace the `[ Name ]` / `[ Role ]` placeholders in the
  `<ul class="team__grid">` block. Add a photo by putting an `<img>` inside
  `.member__pic`.
- **Contact**: the phone and office-address placeholders are marked with the
  `ph` class in the contact section and in the footer.
- **Roadmap status**: each product card carries a `Planned` pill. Change the
  text there as products move on.
- Product screens in the Work section use demo data and are labelled as such.

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
