# CLAUDE.md

## What this is

The ntell.ai company website: a static, scroll-driven single page (no framework, no build step). See `README.md` for structure and design notes. Source of truth is this repo, `github.com/deepaksx/ntell` (a fork of Dewashish's `dewashish/ntell`, kept as the `upstream` remote).

Run locally (must be served over HTTP): `python -m http.server 4173`, then open http://127.0.0.1:4173/.

## Deployment — TWO PHRASES, NOTHING ELSE

Hosted on **AWS Amplify Hosting** (region `ap-south-1`, personal AWS account 329643601284, profile `personal` — NOT the default profile; always pass `--profile personal --region ap-south-1`, the machine has an empty `AWS_REGION` that breaks the CLI). Monitor view: Nexora → Admin area → Websites. Same workflow as nxsys.com.

1. **"Put it on test"** (or any request to change the site): make the change on branch `staging`, commit, `git push origin staging`. This updates ONLY the password-protected test copy (login shown in Nexora → Websites → Test copy). It never touches the live site. Do this by default for every change.
2. **"Publish"** (or "go live"): merge `staging` into `main` (fast-forward) and `git push origin main`. This IS the production deploy. **Never push to `main` unless the owner has just said "publish" in this conversation.**

Rules: never commit directly to `main`. To undo a publish, revert the commit on `main` and push (only when asked). Do not delete the `upstream` remote.

## Dewashish's changes

Dewashish may keep pushing to `dewashish/ntell`. Only when the owner asks to bring them in: `git fetch upstream`, merge `upstream/main` into `staging`, check the test copy, then wait for "publish".

## Content still to fill

Team names/roles/photos and the phone and office-address placeholders (class `ph`) are placeholders. Do not publish to `main` with placeholders still visible unless the owner explicitly says so.
