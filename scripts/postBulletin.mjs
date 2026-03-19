#!/usr/bin/env node
// scripts/postBulletin.mjs
//
// Post a DMF bulletin to the app from a GovDelivery URL or manual input.
//
// Usage:
//   # Auto-scrape from GovDelivery URL:
//   node --env-file=.env.development scripts/postBulletin.mjs \
//     --url "https://content.govdelivery.com/accounts/NCDEQ/bulletins/40eb743"
//
//   # With overrides:
//   node --env-file=.env.development scripts/postBulletin.mjs \
//     --url "https://content.govdelivery.com/accounts/NCDEQ/bulletins/40eb743" \
//     --type advisory \
//     --priority important \
//     --expires 2026-04-30
//
//   # Fully manual (no URL scraping):
//   node --env-file=.env.development scripts/postBulletin.mjs \
//     --title "Shellfish Lease Hearing March 31" \
//     --description "Public hearing on proposed shellfish leases in Carteret County..." \
//     --type info \
//     --source-url "https://content.govdelivery.com/accounts/NCDEQ/bulletins/40eb743"
//
//   # For production:
//   node --env-file=.env.production scripts/postBulletin.mjs --url "..."
//
// Environment variables (from .env file):
//   EXPO_PUBLIC_SUPABASE_URL   - Supabase project URL
//   BULLETIN_ADMIN_SECRET      - (optional) must match edge function secret

import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    url:        { type: 'string', short: 'u' },
    title:      { type: 'string', short: 't' },
    description:{ type: 'string', short: 'd' },
    notes:      { type: 'string', short: 'n' },
    type:       { type: 'string', default: 'info' },
    priority:   { type: 'string', default: 'normal' },
    effective:  { type: 'string' },
    expires:    { type: 'string' },
    'source-label': { type: 'string', default: 'NC DMF' },
    'source-url':   { type: 'string' },
    order:      { type: 'string', default: '0' },
    'dry-run':  { type: 'boolean', default: false },
    help:       { type: 'boolean', short: 'h', default: false },
    prod:       { type: 'boolean', default: false },
  },
  strict: false,
});

if (args.help) {
  console.log(`
Post DMF Bulletin to Fish Log App
──────────────────────────────────

FLAGS:
  --url, -u         GovDelivery bulletin URL (auto-scrapes title & description)
  --title, -t       Bulletin title (overrides scraped title)
  --description, -d Bulletin body text (overrides scraped description)
  --notes, -n       Extra notes shown in detail view
  --type            closure | advisory | educational | info  (default: info)
  --priority        urgent | important | normal  (default: normal)
  --effective       Effective date (YYYY-MM-DD, default: today)
  --expires         Expiration date (YYYY-MM-DD)
  --source-label    Source attribution (default: "NC DMF")
  --source-url      Link to original source (defaults to --url if provided)
  --order           Display order integer (default: 0)
  --dry-run         Show payload without posting
  --help, -h        Show this help

EXAMPLES:
  # Quick post from a GovDelivery link:
  node --env-file=.env.development scripts/postBulletin.mjs \\
    --url "https://content.govdelivery.com/accounts/NCDEQ/bulletins/40eb743"

  # Post as advisory with expiration:
  node --env-file=.env.development scripts/postBulletin.mjs \\
    --url "https://content.govdelivery.com/accounts/NCDEQ/bulletins/40eb743" \\
    --type advisory --priority important --expires 2026-04-15
`);
  process.exit(0);
}

// Validate
if (!args.url && !args.title) {
  console.error('Error: Provide --url (to scrape) or --title (for manual entry).');
  console.error('Run with --help for usage info.');
  process.exit(1);
}

const VALID_TYPES = ['closure', 'advisory', 'educational', 'info'];
const VALID_PRIORITIES = ['urgent', 'important', 'normal'];

if (!VALID_TYPES.includes(args.type)) {
  console.error(`Error: --type must be one of: ${VALID_TYPES.join(', ')}`);
  process.exit(1);
}
if (!VALID_PRIORITIES.includes(args.priority)) {
  console.error(`Error: --priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
  process.exit(1);
}

// Build the Supabase function URL
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL. Run with --env-file flag.');
  process.exit(1);
}

const adminSecret = process.env.BULLETIN_ADMIN_SECRET || '';
const functionUrl = `${supabaseUrl}/functions/v1/ingest-dmf-bulletin`;

// Build payload
const payload = {
  ...(args.url && { url: args.url }),
  ...(args.title && { title: args.title }),
  ...(args.description && { description: args.description }),
  ...(args.notes && { notes: args.notes }),
  bulletinType: args.type,
  priority: args.priority,
  ...(args.effective && { effectiveDate: args.effective }),
  ...(args.expires && { expirationDate: args.expires }),
  sourceLabel: args['source-label'],
  ...(!args.url && args['source-url'] && { url: args['source-url'] }),
  displayOrder: parseInt(args.order, 10) || 0,
};

console.log('\n📋 Bulletin payload:');
console.log(JSON.stringify(payload, null, 2));

if (args['dry-run']) {
  console.log('\n🔍 Dry run — nothing posted.');
  process.exit(0);
}

console.log(`\n🚀 Posting to ${functionUrl}...`);

try {
  const headers = { 'Content-Type': 'application/json' };
  if (adminSecret) {
    headers['x-admin-secret'] = adminSecret;
  }

  const res = await fetch(functionUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`\n❌ Error (${res.status}):`);
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log('\n✅ Bulletin created successfully!');
  console.log(`   ID:    ${data.bulletin?.id}`);
  console.log(`   Title: ${data.bulletin?.title}`);
  console.log(`   Type:  ${data.bulletin?.bulletin_type}`);
  if (data.bulletin?.effective_date) {
    console.log(`   Date:  ${data.bulletin.effective_date}`);
  }
} catch (err) {
  console.error('\n❌ Request failed:', err.message);
  process.exit(1);
}
