# Security Policy

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report it privately via
[GitHub Security Advisories](https://github.com/akhiakl/tickd/security/advisories/new) for this
repository ("Security" tab -> "Report a vulnerability"). This opens a private discussion with
maintainers before anything is public.

Include, as far as you're able:

- A description of the vulnerability and its potential impact
- Steps to reproduce (a minimal repro is ideal)
- Any relevant logs, screenshots, or affected versions/commits

## What to expect

- We'll acknowledge your report as soon as we can.
- We'll investigate and keep you updated as we work on a fix.
- Once a fix is ready, we'll coordinate on disclosure timing with you before making anything
  public.

## Scope

This covers the application code in this repository. It does not cover the security of
third-party services it integrates with (Auth0, your Postgres provider, Upstash, Vercel, Sentry) -
please report issues in those services directly to their maintainers.
