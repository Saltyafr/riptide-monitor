/**
 * check-links.js
 * Riptide Studios — Site Health Monitor
 *
 * What this script does:
 *   1. Reads the list of client sites from monitoring-data/sites.json
 *   2. Runs a broken link check on each site's homepage (not a deep crawl)
 *   3. Writes the results to monitoring-data/link-check-results.json
 *   4. Exits with code 1 if ANY broken links are found (this triggers
 *      the email alert in the GitHub Actions workflow)
 *   5. Exits with code 0 if everything is healthy
 *
 * Run by: GitHub Actions on a cron schedule (daily at 6am UTC)
 * Dependencies: linkinator (installed globally via npm in the workflow)
 */

const { LinkChecker } = require('linkinator');
const fs = require('fs');
const path = require('path');

// ─── File paths ────────────────────────────────────────────────────────────────

const SITES_FILE   = path.join(__dirname, '..', 'monitoring-data', 'sites.json');
const RESULTS_FILE = path.join(__dirname, '..', 'monitoring-data', 'link-check-results.json');

// ─── Main function ─────────────────────────────────────────────────────────────

async function main() {
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
  let anyBrokenLinks = false;

  // Loop through each client site and check for broken links
  for (const site of sites) {
    console.log(`\nChecking links for: ${site.name} (${site.url})`);

    try {
      const siteResult = await checkSite(site);
      results[site.id] = siteResult;

      if (siteResult.status === 'warning') {
        anyBrokenLinks = true;
        console.log(`  ⚠️  ${siteResult.brokenLinks.length} broken link(s) found`);
        siteResult.brokenLinks.forEach(link => {
          console.log(`     - ${link.url} (HTTP ${link.status})`);
        });
      } else if (siteResult.status === 'healthy') {
        console.log(`  ✅ All ${siteResult.totalChecked} links OK`);
      } else {
        console.log(`  ❌ Error checking site: ${siteResult.error}`);
      }

    } catch (err) {
      // If the entire check crashes for a site, record the error and move on
      console.log(`  ❌ Unexpected error: ${err.message}`);
      results[site.id] = {
        brokenLinks: [],
        totalChecked: 0,
        status: 'error',
        error: err.message
      };
    }
  }

  // Write results to JSON file (GitHub Actions will commit this to the repo)
  writeResults({
    lastChecked: new Date().toISOString(),
    results
  });

  console.log('\n─────────────────────────────────────');
  console.log('Link check complete.');
  console.log(`Results written to: monitoring-data/link-check-results.json`);

  // Exit with code 1 if broken links were found — this tells the GitHub Actions
  // workflow to send an email alert
  if (anyBrokenLinks) {
    console.log('Status: BROKEN LINKS FOUND — exiting with code 1 to trigger alert.');
    process.exit(1);
  } else {
    console.log('Status: All links healthy — exiting with code 0.');
    process.exit(0);
  }
}

// ─── Check a single site ───────────────────────────────────────────────────────

async function checkSite(site) {
  const checker = new LinkChecker();
  const checkedLinks = [];
  const brokenLinks  = [];

  // linkinator emits a 'link' event for each link it processes
  checker.on('link', result => {
    checkedLinks.push(result);

    // A broken link has a BROKEN state
    if (result.state === 'BROKEN') {
      brokenLinks.push({
        url:    result.url,
        status: result.status || 0   // HTTP status code (e.g. 404, 500)
      });
    }
  });

  // Run the check — homepage only, no deep crawl (recurse: false)
  await checker.check({
    path:       site.url,
    recurse:    false,        // Only check links on the homepage, not the whole site
    timeout:    10000,        // 10 second timeout per link request
    retryErrors:       false, // Don't retry on errors — keep the run fast
    retryErrorsCount:  0
  });

  const totalChecked = checkedLinks.length;

  if (brokenLinks.length > 0) {
    return {
      brokenLinks,
      totalChecked,
      status: 'warning'
    };
  }

  return {
    brokenLinks: [],
    totalChecked,
    status: 'healthy'
  };
}

// ─── Write results to JSON file ────────────────────────────────────────────────

function writeResults(data) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Run ───────────────────────────────────────────────────────────────────────

main().catch(err => {
  // Top-level catch — if something catastrophic happens, log it and exit with error
  console.error('Fatal error in check-links.js:', err);
  process.exit(1);
});
