
console.log('--- Environment Variable Diagnostic ---');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? 'PRESENT' : 'MISSING');
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'PRESENT' : 'MISSING');
console.log('VITE_PLAID_CLIENT_ID:', import.meta.env.VITE_PLAID_CLIENT_ID ? 'PRESENT' : 'MISSING');
console.log('VITE_PLAID_SECRET:', import.meta.env.VITE_PLAID_SECRET ? 'PRESENT' : 'MISSING');
console.log('VITE_PLAID_ENV:', import.meta.env.VITE_PLAID_ENV);
console.log('---------------------------------------');
