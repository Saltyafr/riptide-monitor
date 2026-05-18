/**
 * detect-changes.js
 * Riptide Studios — Site Health Monitor
 *
 * What this script does:
 *   1. Reads the list of client sites from monitoring-data/sites.json
 *   2. Fetches each site's homepage HTML
 *   3. Strips scripts, styles, and timestamp elements to avoid false positives
 *      from dynamic content (live clocks, rotating banners, date fields, etc.)
 *   4. Generates an MD5 hash of the cleaned body text
 *   5. Compares the hash against the previously stored baseline hash
 *      in monitoring-data/snapshots/{site-id}.hash
 *   6. If the hash has changed → marks the site as "changed"
 *   7. If no baseline exists yet (first run) → saves the hash, marks as "stable"
 *      (no alert on first run — this is intentional initialisation behaviour)
 *   8. Always saves the current hash as the new baseline
 *   9. Writes results to monitoring-data/change-results.json
 *  10. Exits with code 1 if any changes were detected (triggers email alert)
 *
 * Run by: GitHub Actions on a cron schedule (daily at 7am UTC)
 * Dependencies: node-fetch@2, cheerio (installed in workflow via npm)
 *               crypto and fs are built into Node — no install needed
 */

const fetch   = require('node-fetch');
const cheerio = require('cheerio');
const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');

// ─── File paths ────────────────────────────────────────────────────────────────

const SITES_FILE      = path.join(__dirname, '..', 'monitoring-data', 'sites.json');
const RESULTS_FILE    = path.join(__dirname, '..', 'monitoring-data', 'change-results.json');
const SNAPSHOTS_DIR   = path.join(__dirname, '..', 'monitoring-data', 'snapshots');

// How long to wait for a page to respond before giving up (milliseconds)
const FETCH_TIMEOUT_MS = 15000;

// ─── Main function ─────────────────────────────────────────────────────────────

async function main() {
  // Ensure the snapshots directory exists
  if (!fs.existsSync(SNAPSHOTS_DIR)) {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    console.log('Created snapshots directory.');
  }

  // Read the sites list
  const sitesData = JSON.parse(fs.readFileSync(SITES_FILE, 'utf8'));
  const sites = sitesData.sites;

  // If no sites are configured, write an empty result and exit cleanly
  if (!sites || sites.length === 0) {
    console.log('No sites configured in sites.json. Exiting.');
    writeResults({ lastChecked: new Date().toISOString(), results: {} });
    process.exit(0);
  }

  const results = {};
  let anyChangesDetected = false;

  // Loop through each client site and compare its content hash to the baseline
  for (const site of sites) {
    console.log(`\nChecking for changes on: ${site.name} (${site.url})`);

    try {
      const siteResult = await checkSite(site);
      results[site.id] = siteResult;

      if (siteResult.status === 'changed') {
        anyChangesDetected = true;
        console.log(`  ⚠️  Change detected on ${site.name}`);
      } else if (siteResult.status === 'stable') {
        console.log(`  ✅ No changes detected`);
      } else if (siteResult.status === 'initialised') {
        console.log(`  ℹ️  First run — baseline hash saved. No alert.`);
      } else {
        console.log(`  ❌ Error: ${siteResult.error}`);
      }

    } catch (err) {
      // If something unexpected happens for this site, record the error and continue
      console.log(`  ❌ Unexpected error: ${err.message}`);
      results[site.id] = {
        changed:    false,
        lastChange: null,
        status:     'error',
        error:      err.message
      };
    }
  }

  // Write results to JSON file (GitHub Actions will commit this to the repo)
  writeResults({
    lastChecked: new Date().toISOString(),
    results
  });

  console.log('\n─────────────────────────────────────');
  console.log('Change detection complete.');
  console.log('Results written to: monitoring-data/change-results.json');

  // Exit with code 1 if changes were detected — triggers email alert in workflow
  if (anyChangesDetected) {
    console.log('Status: CHANGES DETECTED — exiting with code 1 to trigger alert.');
    process.exit(1);
  } else {
    console.log('Status: No changes detected — exiting with code 0.');
    process.exit(0);
  }
}

// ─── Check a single site for changes ──────────────────────────────────────────

async function checkSite(site) {
  const hashFile = path.join(SNAPSHOTS_DIR, `${site.id}.hash`);
  const now      = new Date().toISOString();

  // Fetch the site's homepage with a timeout
  let html;
  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(site.url, {
      signal: controller.signal,
      headers: {
        // Identify ourselves politely — some servers block requests with no user agent
        'User-Agent': 'RiptideMonitor/1.0 (site change detection; contact@riptidestudios.co.za)'
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    html = await response.text();

  } catch (err) {
    // Fetch failed — record error, do NOT update baseline hash (avoids false positives)
    console.log(`  Fetch failed: ${err.message}`);
    return {
      changed:    false,
      lastChange: null,
      status:     'error',
      error:      err.message
    };
  }

  // Clean the HTML and generate a hash
  const currentHash = generateHash(html);

  // Check if a baseline hash exists for this site
  const baselineExists = fs.existsSync(hashFile);

  if (!baselineExists) {
    // First run for this site — save the hash as baseline, no alert
    fs.writeFileSync(hashFile, currentHash, 'utf8');
    return {
      changed:    false,
      lastChange: null,
      status:     'initialised'  // Special status for first-run (treated as stable in dashboard)
    };
  }

  // Read the stored baseline hash
  const previousHash = fs.readFileSync(hashFile, 'utf8').trim();

  // Always update the baseline to the current hash
  // This means the comparison is always "last run" vs "this run"
  fs.writeFileSync(hashFile, currentHash, 'utf8');

  if (currentHash !== previousHash) {
    // Hash has changed — site content has changed
    return {
      changed:    true,
      lastChange: now,
      status:     'changed'
    };
  }

  // Hash matches — no change
  return {
    changed:    false,
    lastChange: null,
    status:     'stable'
  };
}

// ─── Generate a hash from page content ────────────────────────────────────────

function generateHash(html) {
  // Load HTML into cheerio (a server-side jQuery-like parser)
  const $ = cheerio.load(html);

  // Remove <script> tags — JavaScript changes constantly and isn't page content
  $('script').remove();

  // Remove <style> tags — CSS changes don't affect visible content meaningfully
  $('style').remove();

  // Remove <link rel="stylesheet"> tags
  $('link[rel="stylesheet"]').remove();

  // Remove elements that commonly contain dynamic/changing content:
  // - Elements with class names containing 'timestamp' (e.g. "post-timestamp")
  // - Elements with class names containing 'date' (e.g. "published-date")
  // - Elements with class names containing 'time' (e.g. "post-time")
  // - Elements with class names containing 'clock' (e.g. "live-clock")
  // - Elements with class names containing 'counter' (e.g. "visit-counter")
  // - Elements with class names containing 'widget' (common for dynamic sidebars)
  $('[class*="timestamp"], [class*="date"], [class*="time"], [class*="clock"], [class*="counter"], [class*="widget"]').remove();

  // Extract just the body text (strips all remaining HTML tags)
  const bodyText = $('body').text();

  // Normalise whitespace — collapse multiple spaces/newlines into a single space
  // This prevents whitespace-only changes from triggering a false alert
  const normalised = bodyText.replace(/\s+/g, ' ').trim();

  // Generate and return an MD5 hash of the normalised text
  return crypto.createHash('md5').update(normalised).digest('hex');
}

// ─── Write results to JSON file ────────────────────────────────────────────────

function writeResults(data) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Run ───────────────────────────────────────────────────────────────────────

main().catch(err => {
  // Top-level catch — if something catastrophic happens, log it and exit with error
  console.error('Fatal error in detect-changes.js:', err);
  process.exit(1);
});
