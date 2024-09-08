import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('Test environment setup complete');

// Import and run test scripts
import('./test-supabase').then((module) => {
    console.log('Running Supabase test...');
    return module.runSupabaseTest();
}).then(() => {
    console.log('Supabase test completed');
}).catch((error) => {
    console.error('Supabase test failed:', error);
});

// You can add more test imports here in the future
// import('./another-test-file').then((module) => {
//   console.log('Running another test...');
//   return module.runAnotherTest();
// }).then(() => {
//   console.log('Another test completed');
// }).catch((error) => {
//   console.error('Another test failed:', error);
// });