// Quick test to verify Mansa API is working
// Run with: node test-mansa.js

const MANSA_API_KEY = 'mansa_live_sk_6upqboupcgtfochd';
const API_BASE = 'https://mansaapi.com/api/v1/markets/exchanges/BSE/stocks';

async function testMansa() {
  console.log('Testing Mansa API...');
  console.log(`API Key: ${MANSA_API_KEY.substring(0, 20)}...`);
  console.log(`Endpoint: ${API_BASE}?limit=10`);
  
  try {
    const res = await fetch(`${API_BASE}?limit=10&offset=0`, {
      headers: {
        'Authorization': `Bearer ${MANSA_API_KEY}`,
      },
    });
    
    console.log(`HTTP Status: ${res.status}`);
    const body = await res.json();
    
    if (body.success === false) {
      console.log('❌ Mansa returned error:');
      console.log(JSON.stringify(body, null, 2));
      return;
    }
    
    if (!body.success) {
      console.log('❌ Response missing success field:');
      console.log(JSON.stringify(body, null, 2));
      return;
    }
    
    console.log('✅ Mansa API is working!');
    console.log(`\nFound ${body.data?.length || 0} stocks:`);
    
    if (Array.isArray(body.data)) {
      body.data.slice(0, 10).forEach(stock => {
        console.log(`  ${stock.ticker}: ${stock.name} - P${stock.price} (${stock.change_pct}%)`);
      });
    }
    
    // Check for our specific tickers
    console.log('\n🔍 Looking for our BSE investments:');
    const tickers = ['BIHL', 'LETL', 'LETS', 'SECH', 'SECHABA', 'FNBP', 'IMOP', 'ENPC', 'SEML'];
    const found = body.data?.filter(s => tickers.includes(s.ticker)) || [];
    
    if (found.length > 0) {
      console.log(`Found ${found.length}/${tickers.length}:`);
      found.forEach(s => console.log(`  ✓ ${s.ticker}: ${s.name}`));
    } else {
      console.log('❌ None of our BSE stocks were found in the response');
      console.log('\nAvailable tickers in response:');
      body.data?.slice(0, 20).forEach(s => console.log(`  - ${s.ticker}`));
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testMansa();
