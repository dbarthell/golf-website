# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a static golf reference website for personal use at Minnesota Valley Country Club. It displays club yardages, putting calibration tables (lag putting and Bryson vector putting), and course notes. The site is managed using Spruce for project management.

## Development Workflow

### Running the Site Locally
The site is static HTML/CSS/JS with no build process. Run a local server to test:
```bash
npx serve
```
Or use any static file server (Python's http.server, etc.).

### Data Generation
The Bryson putting table includes interpolated values. To regenerate the full table:
```bash
node scripts/interpolate-bryson.js
```
This reads `data/putting.json` and outputs expanded rows as JSON. The interpolated data is already included in `putting.json`, so this is only needed when modifying the original anchor points.

### Git Workflow
- Branch names follow the pattern `artifact/{ARTIFACT_ID}` (e.g., `artifact/GOL-zkc5fj`)
- Commits reference Spruce artifact IDs in messages
- Changes are merged via pull requests

## Architecture

### File Structure
- `index.html` — Main page with three sections: Yardages, Putting, Notes
- `css/styles.css` — Styling using CSS custom properties for MVCC navy color palette
- `js/app.js` — Client-side rendering of data tables and UI interactions
- `data/clubs.json` — Club distance data (woods, irons, wedges) with stock/full swing values
- `data/putting.json` — Putting tables: lag putting (backswing length), Bryson vector table (steps/feet), ZBL chart, gravity notes
- `scripts/interpolate-bryson.js` — Node.js script for generating interpolated putting data

### Data Loading Pattern
`app.js` fetches JSON data asynchronously on page load, then renders:
- Club cards with category tabs (woods/irons/wedges)
- Multiple putting tables (lag, Bryson, ZBL, gravity notes)
- Accordion UI for course notes

### Putting Data Format
The Bryson table and lag putting table use a special cell format with base values and variance ranges:
- Plain: `"3.5"`
- Negative only: `"9 −1.5"`
- Both directions: `"4 +1.5/−1.5"`

The interpolation script (`interpolate-bryson.js`) parses these, interpolates values between anchor points, and formats them back with Unicode minus signs (U+2212).

## Spruce Project Management

This project uses Spruce for task and feature management:
- Artifacts are stored in `.spruce/artifacts/{type}/{id}.md`
- Templates define features and tasks with status, priority, assignee fields
- Actions include `implement`, `plan`, `test-feature`, `claude-code` for development workflows
- When working on artifacts, read the artifact file and any linked features/tasks for full context
- Update artifact status and document work when completing tasks

## Design System

Colors follow MVCC navy palette defined in CSS custom properties:
- Primary: `--green-dark` (#0d2137), `--green-mid` (#1a3a6e), `--green-accent` (#2563a8)
- Background: `--cream` (#f5f5f0)
- Borders/shadows use subtle grays

Typography uses system fonts (`-apple-system, BlinkMacSystemFont, Segoe UI...`).

## Notes

- No package.json or npm dependencies — this is intentionally a simple static site
- The `.claude/settings.local.json` file contains Claude-specific permissions
- Mock files like `mock-bryson-expanded.html` are used for testing UI layouts
