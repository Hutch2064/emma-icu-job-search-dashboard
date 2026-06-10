# Emma ICU Job Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate local Emma Baron ICU nursing job-search dashboard and automation by cloning Aidan Hutchison's working infrastructure into this workspace.

**Architecture:** Keep Aidan's existing project untouched. Copy the dashboard app into `/Users/aidanhutchison/Documents/New project 3`, replace career/search/resume logic with Emma-specific ICU and DFW rules, run it on port `3001`, create a separate Codex cron automation, and add a separate Desktop `.app` launcher.

**Tech Stack:** Next.js, TypeScript, Vitest, Codex cron automation, macOS LaunchAgent, shell launcher scripts.

---

### Task 1: Clone Baseline Project

- [x] Copy source files while preserving this workspace's `.git`.
- [x] Exclude `node_modules`, `.next`, and Aidan-only generated cache directories.

### Task 2: Add Tests Before Domain Changes

- [x] Add tests proving Emma context parsing extracts ICU nursing profile data.
- [x] Add tests proving ICU staff RN roles in Dallas, Plano, Fort Worth, and other DFW cities pass.
- [x] Add tests proving non-ICU, travel/contract, closed, remote-only, and non-DFW roles fail.
- [x] Add tests proving a missing resume returns a placeholder instead of crashing.
- [x] Run targeted tests and confirm they fail against the copied Aidan implementation.

### Task 3: Implement Emma Domain Rules

- [x] Replace portfolio/investment scoring with ICU nursing scoring.
- [x] Restrict eligibility to DFW locations and currently open applications.
- [x] Reject travel, contract, per diem, home health, clinic-only, non-ICU, and closed postings.
- [x] Make missing resume context explicit and non-fatal.
- [x] Replace job boards with official hospital board support where the local scanner can access public posting APIs.

### Task 4: Rebrand App and Data

- [x] Rename UI and metadata to Emma Baron.
- [x] Update search strings and guardrails to ICU nursing in DFW.
- [x] Initialize Emma data files empty, with separate automation metadata.

### Task 5: Create Separate Automation and Desktop App

- [x] Use port `3001`.
- [x] Use separate logs from Aidan's dashboard.
- [x] Use same daily 8:15 AM Central schedule.
- [x] Launch Emma's app independently from Aidan's app.

### Task 6: Verify

- [x] Run `npm install`.
- [x] Run targeted tests and full `npm test`.
- [x] Run `npm run build`.
- [x] Start or load the separate LaunchAgent.
- [x] Verify `http://localhost:3001/api/dashboard` responds.
