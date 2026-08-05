# GitLab Issue Importer

A small single-page tool I built to stop hand-formatting GitLab issues. I keep a
folder of Markdown issue templates (bug report, feature request, etc.) with
`## Section` headings, and typing the same structure into GitLab's web editor
every time got old. This app reads a template, turns its headings into a form,
and either creates the issue in GitLab directly via the REST API or lets me
download the filled-in Markdown to paste in myself.

It can also pull existing open issues back out of a GitLab project as CSV-like
rows, which I use to prefill the form from a past issue instead of typing
everything from scratch.

## What it actually does

- **GitLab auth**: I enter a GitLab instance URL (defaults to
  `https://gitlab.com`) and a personal access token (scope `api`). The token
  is only kept in React state for the session — it's sent as a `PRIVATE-TOKEN`
  header on each request and never written to storage.
- **Project list**: after authenticating, it calls `GET /api/v4/projects?membership=true`
  and lets me pick which project I'm working in from a dropdown.
- **Markdown template upload**: I upload one or more `.md` files. Each `## `
  heading in the file becomes a form field (a title field is always added
  first); the file's own body becomes the Markdown skeleton that gets filled
  back in.
- **Issue form**: filling out the generated form and clicking "In GitLab
  erstellen" POSTs a new issue (`title` + assembled Markdown `description`) to
  `POST /api/v4/projects/:id/issues`. "Als Markdown" instead downloads the
  filled template as a `.md` file, no API call needed.
- **Image attachments**: images I attach get embedded as base64 data URIs
  directly into the generated Markdown under a "Screenshots / Bilder" section
  (not uploaded to GitLab's own attachment endpoint).
- **CSV / issue import**: "Issues importieren" fetches open issues from the
  selected project (`GET /api/v4/projects/:id/issues?state=opened`) and lists
  them in the sidebar; clicking one prefills the form fields for editing. A
  manual CSV upload does the same by parsing an uploaded `.csv` file instead.
- Everything runs client-side in the browser — there's no backend, no
  database, nothing persisted across a reload. The UI text is in German, since
  that's what I use day to day.

## Stack

- React 19 + Vite 7
- React Router 7 (`createBrowserRouter`, single route `/` plus a catch-all 404)
- Tailwind CSS 3 for styling
- `lucide-react` for icons

## Running it

```bash
npm install
npm run dev      # start the Vite dev server with HMR
npm run build    # production build into dist/
npm run preview  # serve the production build locally
npm run lint     # eslint
```

## Requirements to actually use it

- A GitLab instance reachable from the browser (gitlab.com or self-hosted).
- A GitLab **personal access token** with `api` scope, created under
  Settings → Access Tokens.
- At least one Markdown template file with `## Section` headings to get a
  usable form — without one, the right-hand panel just tells you to upload
  one.

There's no environment file or server-side config: the GitLab URL and token
are entered in the UI itself each session.
