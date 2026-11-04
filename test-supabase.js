const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://aphnnkggramqnsvdxjfj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwaG5ua2dncmFtcW5zdmR4amZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3MzQzOTUsImV4cCI6MjEwOTMxMDM5NX0.gx7QYq3puQ5JgG95Fr9Egy1SkWX_zqslLbGpMuF17cU'
);

async function test() {
  console.log('Testing Supabase connection...');
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('SUCCESS! Connected to Supabase');
    console.log('Data:', data);
  }
}

test();
