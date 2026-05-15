require('dotenv').config({path: './backend/.env'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
async function run() {
  const { data, error } = await supabase.from('bookings').select('*');
  console.log('Bookings:', data ? data.map(b => b.start_datetime) : error);
}
run();
