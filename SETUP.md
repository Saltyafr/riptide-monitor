# Riptide Monitor — Setup Guide

This guide walks you through everything you need to do to get the monitoring system live.
Follow every step in order. Don't skip ahead.

**Estimated time:** 30–45 minutes (most of it is account setup, not technical work)

---

## What you'll have when this is done

- A live dashboard at `https://YOUR-GITHUB-USERNAME.github.io/riptide-monitor/`
- UptimeRobot pinging every client site every 5 minutes, 24/7
- Daily broken link checks running automatically on GitHub's servers
- Daily site change detection running automatically on GitHub's servers
- Email alerts sent to your inbox whenever something goes wrong

---

## Before you start — what you need

- A GitHub account (you already have one from BUFF Tracker)
- A Gmail account you'll use just for monitoring alerts (details in Step 4)
- The files from this build (all files in this repo)

---

## STEP 1 — Create a free UptimeRobot account

UptimeRobot is the service that pings your client sites every 5 minutes and sends
an email the moment a site goes down. It runs on their servers 24/7 — no browser
tab needs to be open.

1. Go to [https://uptimerobot.com](https://uptimerobot.com)
2. Click **Register for FREE**
3. Fill in your name, email and a password
4. Verify your email address (check your inbox)
5. Log in to your new UptimeRobot account

You don't need to add any monitors yet — that comes in Step 7.

---

## STEP 2 — Get your UptimeRobot Read-Only API key

This key lets the dashboard read your monitor data. It is read-only — it cannot
create, change or delete anything in UptimeRobot.

1. In UptimeRobot, click your name/avatar in the top right
2. Click **My Settings**
3. Scroll down to the **API Settings** section
4. Find **Read-Only API Key** (not the main API key — the read-only one)
5. Copy this key and save it somewhere (Notepad is fine) — you'll need it in Step 9

> ⚠️ **Important:** Use the **Read-Only** key only. Never paste your main API key
> into the dashboard.

---

## STEP 3 — Create the GitHub repository

1. Go to [https://github.com](https://github.com) and log in
2. Click the **+** icon in the top right → **New repository**
3. Set the repository name to exactly: `riptide-monitor`
4. Set visibility to **Public** (required — the dashboard reads files from this repo)
5. Do **not** tick "Add a README file" or any other initialisation options
6. Click **Create repository**

You now have an empty public repo at `https://github.com/YOUR-USERNAME/riptide-monitor`

---

## STEP 4 — Set up a dedicated Gmail account for alerts

The monitoring system sends alert emails through Gmail. It's best practice to
use a separate Gmail account for this rather than your personal one.

1. Go to [https://accounts.google.com/signup](https://accounts.google.com/signup)
2. Create a new Gmail account — something like `monitor.riptidestudios@gmail.com`
   or use any name you prefer
3. Once the account is created, **enable 2-Step Verification** on it:
   - Click your profile picture → **Manage your Google Account**
   - Go to **Security** tab
   - Under "How you sign in to Google", click **2-Step Verification**
   - Follow the steps to turn it on (use your phone number or the Google app)
4. After 2FA is enabled, create an **App Password**:
   - Go back to **Security** tab
   - Search for "App Passwords" in the search bar at the top of the settings page
   - Under App name, type: `Riptide Monitor`
   - Click **Create**
   - Google will show you a 16-character password (looks like: `abcd efgh ijkl mnop`)
   - **Copy this password and save it now** — Google only shows it once
   - This App Password is what the monitoring system uses to send emails.
     It is NOT your Gmail login password.

> ⚠️ **App Passwords only appear if 2FA is enabled.** If you don't see the option,
> 2FA is not turned on yet.

---

## STEP 5 — Push all files to GitHub

Now you'll upload all the monitoring system files to the repo you created.

If you're comfortable with Git on the command line, clone the repo and push normally.

**If you've never used Git before, use GitHub Desktop:**

1. Download GitHub Desktop from [https://desktop.github.com](https://desktop.github.com)
2. Sign in with your GitHub account
3. Click **File → Clone repository**
4. Find `riptide-monitor` in the list and clone it to your computer
5. Copy all the files from this build into that folder. The structure must be:

```
riptide-monitor/
├── index.html
├── SETUP.md
├── monitoring-data/
│   ├── sites.json
│   ├── link-check-results.json
│   ├── change-results.json
│   └── snapshots/
├── scripts/
│   ├── check-links.js
│   └── detect-changes.js
└── .github/
    └── workflows/
        ├── link-checker.yml
        └── change-detector.yml
```

6. In GitHub Desktop, you'll see all the files listed as changes
7. At the bottom left, type a commit message: `Initial setup`
8. Click **Commit to main**
9. Click **Push origin**

All files are now live on GitHub.

---

## STEP 6 — Add GitHub repository secrets

The email alert system needs three secrets stored securely in GitHub.
These are encrypted — nobody can read them, not even you after saving.

1. Go to your repo on GitHub: `https://github.com/YOUR-USERNAME/riptide-monitor`
2. Click **Settings** (top menu of the repo)
3. In the left sidebar, click **Secrets and variables → Actions**
4. Click **New repository secret** for each of the following three secrets:

| Secret name  | Value to enter                                              |
|--------------|-------------------------------------------------------------|
| `GMAIL_USER` | The Gmail address you created in Step 4 (e.g. `monitor.riptidestudios@gmail.com`) |
| `GMAIL_PASS` | The 16-character App Password from Step 4 (without spaces) |
| `ALERT_EMAIL`| The email address that should receive alerts (your and Katherine's work email — you can enter one address here; if you need both, separate with a comma) |

> ⚠️ For `GMAIL_PASS`: enter the App Password **without spaces**.
> Google shows it as `abcd efgh ijkl mnop` but enter it as `abcdefghijklmnop`.

---

## STEP 7 — Enable GitHub Pages

This makes your dashboard accessible as a live website.

1. In your repo on GitHub, click **Settings**
2. In the left sidebar, click **Pages**
3. Under **Source**, select **Deploy from a branch**
4. Under **Branch**, select `main` and folder `/` (root)
5. Click **Save**
6. Wait about 1–2 minutes, then refresh the page
7. You'll see a green banner: *"Your site is live at https://YOUR-USERNAME.github.io/riptide-monitor/"*

Your dashboard is now live. Open that URL to check it loads correctly.
It will show the "Setup Required" screen until you complete Step 9.

---

## STEP 8 — Add your first client site to UptimeRobot

For each client website you want to monitor:

1. Log in to UptimeRobot
2. Click **+ Add New Monitor**
3. Set the following:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** Client's business name (e.g. `Acme Corp`)
   - **URL:** The full website URL (e.g. `https://acmecorp.co.za`)
   - **Monitoring Interval:** 5 minutes
4. Under **Alert Contacts**, make sure your email is selected so you receive alerts
5. Click **Create Monitor**

Repeat for each client site.

> 💡 **URL must match exactly** — use the same URL format you'll use in the dashboard
> (e.g. if the site redirects from `http://` to `https://`, use the `https://` version).

---

## STEP 9 — Open the dashboard and complete setup

1. Open your dashboard URL: `https://YOUR-USERNAME.github.io/riptide-monitor/`
2. The Setup modal will open automatically
3. Fill in the three fields:
   - **UptimeRobot Read-Only API Key** — from Step 2
   - **GitHub Username** — your GitHub username
   - **GitHub Repository Name** — `riptide-monitor`
4. Click **Save & Connect**

The dashboard will fetch data and display your monitors.

---

## STEP 10 — Add client sites to the dashboard

For each client site you added to UptimeRobot:

1. In the dashboard, click **+ Add Site**
2. Enter the client name and URL (must match exactly what you entered in UptimeRobot)
3. Click **Add Site**

The card will appear immediately in "checking" state while data loads.

---

## STEP 11 — Update sites.json in the GitHub repo

The GitHub Actions workflows (link checker and change detector) read their list of
sites from `monitoring-data/sites.json` in the repo. You need to keep this file
in sync with the sites you've added in the dashboard.

For each site you added in Step 10:

1. Go to your repo on GitHub
2. Click on `monitoring-data/` → `sites.json`
3. Click the pencil icon (Edit this file)
4. Add your site to the `sites` array. Use the same ID format: `site_` + a timestamp.
   You can find the exact ID the dashboard generated by opening your browser's
   developer tools → Application → Local Storage → `riptide_sites`.

The format is:

```json
{
  "sites": [
    {
      "id": "site_1716000000000",
      "name": "Acme Corp",
      "url": "https://acmecorp.co.za"
    }
  ]
}
```

5. Scroll down and click **Commit changes**

> ⚠️ The `id` in `sites.json` must match the `id` stored in the dashboard's
> localStorage exactly. If they don't match, the link checker and change detector
> results won't appear on the dashboard card for that site.

---

## STEP 12 — Test the GitHub Actions workflows manually

Before waiting for the automated daily schedule, test both workflows now to
confirm everything is wired up correctly.

1. Go to your repo on GitHub
2. Click the **Actions** tab
3. In the left sidebar, click **Broken Link Checker**
4. Click **Run workflow** → **Run workflow** (the green button)
5. Wait about 1–2 minutes, then refresh the page
6. Click the workflow run to see the logs — confirm it completes without a red ✗

Repeat for **Site Change Detector**.

After both workflows run:
- Check that `monitoring-data/link-check-results.json` has been updated in the repo
- Check that `monitoring-data/change-results.json` has been updated in the repo
- Check that `monitoring-data/snapshots/` now contains a `.hash` file for each site
- Refresh your dashboard — the Broken Links and Site Changes metrics should now show data

---

## You're live ✅

Here's a summary of what's now running:

| What                        | How often     | Where it runs         |
|-----------------------------|---------------|-----------------------|
| Uptime checks               | Every 5 min   | UptimeRobot's servers |
| Broken link checks          | Daily, 6am UTC | GitHub Actions        |
| Site change detection       | Daily, 7am UTC | GitHub Actions        |
| Dashboard auto-refresh      | Every 5 min   | Your browser (when open) |

---

## Daily operations — what you need to do

**When you get an email alert:**
1. Open the dashboard to see which site is affected and what the issue is
2. Investigate and resolve the issue
3. Notify the client explaining what happened and how it was resolved

**When you add a new client site:**
1. Add it in UptimeRobot (Step 8)
2. Add it in the dashboard via + Add Site (Step 10)
3. Update `monitoring-data/sites.json` in the GitHub repo (Step 11)

**When you remove a client:**
1. Remove their monitor from UptimeRobot
2. Click Remove on their card in the dashboard
3. Remove their entry from `monitoring-data/sites.json` in GitHub
4. Delete their `.hash` file from `monitoring-data/snapshots/` in GitHub

---

## Troubleshooting

**Dashboard shows "Checking..." but never loads data**
- Confirm your UptimeRobot Read-Only API key is correct (click Setup and re-enter it)
- Confirm the site URL in UptimeRobot matches the URL in the dashboard exactly

**Broken Links / Site Changes metrics always show "—"**
- Confirm `monitoring-data/sites.json` in the repo has the site with the correct ID
- Run the workflows manually from the Actions tab (Step 12) and check the logs for errors
- Confirm the repo name and GitHub username in Setup are correct

**GitHub Actions workflow fails with an email error**
- Confirm `GMAIL_USER` and `GMAIL_PASS` secrets are set correctly (Settings → Secrets → Actions)
- Confirm 2FA is enabled on the Gmail account
- Confirm you used the App Password (not the Gmail login password)
- Confirm the App Password was entered without spaces

**Getting false "site changed" alerts on a client site**
- The site may have dynamic content that isn't being stripped (live counters, rotating content)
- This can be tuned in `scripts/detect-changes.js` — add the relevant CSS class names
  to the element removal list in the `generateHash` function
- Contact a developer if you're unsure how to do this

**PageSpeed shows "—" for a site**
- Google's PageSpeed API has rate limits on the free tier
- If you have many sites and they all load at once, some may be rate-limited
- Wait 5 minutes and click Refresh — they usually resolve on the next attempt

---

## Secrets reference

Keep these stored securely (not in the repo):

| What                        | Where to find it                                      |
|-----------------------------|-------------------------------------------------------|
| UptimeRobot Read-Only Key   | UptimeRobot → My Settings → API Settings              |
| Gmail App Password          | Google Account → Security → App Passwords             |
| Dashboard URL               | `https://YOUR-USERNAME.github.io/riptide-monitor/`    |

---

*Riptide Studios — Internal Monitoring System*
*Setup guide version 1.0 — May 2026*
