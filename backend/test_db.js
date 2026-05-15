require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
async function run() {
  const { data, error } = await supabase.from('bookings').select('start_datetime, end_datetime, status');
  console.log('Bookings:', data || error);
}
run();
