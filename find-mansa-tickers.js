// Search for correct Mansa tickers
// Run with: node find-mansa-tickers.js

const MANSA_API_KEY = 'mansa_live_sk_6upqboupcgtfochd';
const API_BASE = 'https://mansaapi.com/api/v1/markets/exchanges/BSE/stocks';

async function findTickers() {
  console.log('Fetching all BSE stocks from Mansa...');
  
  try {
    // Fetch all stocks (paginate if needed)
    let allStocks = [];
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
      const res = await fetch(`${API_BASE}?limit=200&offset=${offset}`, {
        headers: { 'Authorization': `Bearer ${MANSA_API_KEY}` },
      });
      
      const body = await res.json();
      if (!body.success || !Array.isArray(body.data)) break;
      
      allStocks = allStocks.concat(body.data);
      hasMore = body.pagination?.has_more || false;
      offset += body.data.length;
      
      console.log(`Fetched ${body.data.length} stocks (total: ${allStocks.length})`);
    }
    
    console.log(`\n📊 Total stocks available on Mansa: ${allStocks.length}\n`);
    
    // Search for common Botswana companies
    const searchTerms = [
      'Letshego', 'LETS', 'LETL',
      'Sechaba', 'SECHABA', 'SECH',
      'Pula', 'PULA', 'BPOP',
      'First National', 'FNBP', 'FNB',
      'Telecom', 'BTCL', 'BTC',
      'Engen', 'ENPC',
      'Seabelo', 'SEML',
      'Craton', 'CREC',
      'Impact', 'IMOP'
    ];
    
    console.log('🔍 Searching for companies matching our criteria:\n');
    
    for (const term of searchTerms) {
      const matches = allStocks.filter(s => 
        s.ticker.toUpperCase().includes(term.toUpperCase()) ||
        s.name.toUpperCase().includes(term.toUpperCase())
      );
      
      if (matches.length > 0) {
        matches.forEach(m => {
          console.log(`✓ ${m.ticker.padEnd(10)} - ${m.name} (P${m.price})`);
        });
        console.log('');
      }
    }
    
    // List top 20 by market cap or just first 20
    console.log('\n📈 First 20 stocks on Mansa:\n');
    allStocks.slice(0, 20).forEach(s => {
      console.log(`  ${s.ticker.padEnd(12)} - ${s.name.substring(0, 40)}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findTickers();
