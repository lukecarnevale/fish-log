// scripts/testSupabase.ts
//
// Test script to verify Supabase connection and tables.
// Run with: npx ts-node scripts/testSupabase.ts
//

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qygvvgbateuorpxntdbq.supabase.co';
const SUPABASE_ANON_KEY = '***REDACTED_SUPABASE_KEY***';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('🔌 Testing Supabase connection...\n');

  // Test 1: Basic connection
  console.log('1️⃣  Testing basic connection...');
  try {
    const { data, error } = await supabase.from('rewards_config').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      console.log('   ❌ Connection failed:', error.message);
      return false;
    }
    console.log('   ✅ Connected to Supabase!\n');
  } catch (err) {
    console.log('   ❌ Connection error:', err);
    return false;
  }

  // Test 2: Check rewards tables
  console.log('2️⃣  Checking rewards tables...');
  const rewardsTables = ['rewards_config', 'rewards_drawings', 'prizes', 'drawing_prizes', 'user_rewards_entries'];
  for (const table of rewardsTables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error && error.code !== 'PGRST116') {
      console.log(`   ❌ ${table}: ${error.message}`);
    } else {
      console.log(`   ✅ ${table}`);
    }
  }
  console.log('');

  // Test 3: Check user/report tables
  console.log('3️⃣  Checking user & report tables...');
  const userTables = ['users', 'harvest_reports', 'fish_entries', 'achievements', 'user_achievements', 'user_species_stats', 'device_merge_requests'];
  for (const table of userTables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error && error.code !== 'PGRST116') {
      console.log(`   ❌ ${table}: ${error.message}`);
    } else {
      console.log(`   ✅ ${table}`);
    }
  }
  console.log('');

  // Test 4: Try creating a test user
  console.log('4️⃣  Testing user creation...');
  const testDeviceId = `test_device_${Date.now()}`;
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      device_id: testDeviceId,
      first_name: 'Test',
      last_name: 'User',
    })
    .select()
    .single();

  if (createError) {
    console.log('   ❌ User creation failed:', createError.message);
  } else {
    console.log('   ✅ Created test user:', newUser.id);

    // Test 5: Try creating a test report
    console.log('\n5️⃣  Testing report creation...');
    const { data: newReport, error: reportError } = await supabase
      .from('harvest_reports')
      .insert({
        user_id: newUser.id,
        harvest_date: new Date().toISOString().split('T')[0],
        area_code: '34',
        area_label: 'Pamlico Sound',
        red_drum_count: 1,
        flounder_count: 0,
        spotted_seatrout_count: 0,
        weakfish_count: 0,
        striped_bass_count: 0,
      })
      .select()
      .single();

    if (reportError) {
      console.log('   ❌ Report creation failed:', reportError.message);
    } else {
      console.log('   ✅ Created test report:', newReport.id);

      // Check if trigger updated user stats
      const { data: updatedUser } = await supabase
        .from('users')
        .select('total_reports, total_fish')
        .eq('id', newUser.id)
        .single();

      if (updatedUser) {
        console.log(`   📊 User stats updated: ${updatedUser.total_reports} reports, ${updatedUser.total_fish} fish`);
      }

      // Clean up test report
      await supabase.from('harvest_reports').delete().eq('id', newReport.id);
      console.log('   🧹 Cleaned up test report');
    }

    // Clean up test user
    await supabase.from('users').delete().eq('id', newUser.id);
    console.log('   🧹 Cleaned up test user');
  }

  console.log('\n✨ All tests complete!');
  return true;
}

// Run the tests
testConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
