const cleanIsbn = '9789556950076'; // Madol doova

function getSriLankanISBNHyphenations(isbn) {
  const clean = isbn.replace(/[-\s]/g, '');
  const hyphenations = [];

  if (clean.length === 13 && (clean.startsWith('978955') || clean.startsWith('978624'))) {
    const prefix = clean.slice(0, 3);
    const group = clean.slice(3, 6);
    const rest = clean.slice(6, 12);
    const check = clean.slice(12);
    for (let pubLen = 2; pubLen <= 5; pubLen++) {
      const pub = rest.slice(0, pubLen);
      const item = rest.slice(pubLen);
      hyphenations.push(`${prefix}-${group}-${pub}-${item}-${check}`);
    }
  } else if (clean.length === 10 && clean.startsWith('955')) {
    const group = clean.slice(0, 3);
    const rest = clean.slice(3, 9);
    const check = clean.slice(9);
    for (let pubLen = 2; pubLen <= 5; pubLen++) {
      const pub = rest.slice(0, pubLen);
      const item = rest.slice(pubLen);
      hyphenations.push(`${group}-${pub}-${item}-${check}`);
    }
  }

  return hyphenations;
}

function parseIsbnLkHTML(html) {
  const rows = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  
  while ((match = trRegex.exec(html)) !== null) {
    const rowHtml = match[1];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const tds = [];
    let tdMatch;
    
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      const cellText = tdMatch[1].replace(/<[^>]*>/g, '').trim();
      tds.push(cellText);
    }
    
    if (tds.length >= 5) {
      const publisher = tds[0];
      const title = tds[1];
      const author = tds[2];
      const isbn = tds[3];
      const issueDate = tds[4];

      if (!title || !author || title.toLowerCase().includes('title of the book')) {
        continue;
      }

      rows.push({
        publisher: publisher || '',
        title: title || '',
        author: author || '',
        isbn: isbn || '',
        publishedYear: issueDate ? issueDate.split('-')[0] : ''
      });
    }
  }
  return rows;
}

async function lookupSriLankanISBN(isbn) {
  const hyphenations = getSriLankanISBNHyphenations(isbn);
  if (hyphenations.length === 0) return null;

  console.log('Querying patterns in parallel:', hyphenations);
  const startTime = Date.now();

  const fetchPromises = hyphenations.map(async (hyp) => {
    try {
      const bodyParams = new URLSearchParams({
        publishername: '',
        booktitle: '',
        authorsname: '',
        ccode: '',
        prefixnumber: hyp,
        fromdate: '',
        todate: '',
        submit: 'Search'
      });

      const response = await fetch('https://isbn.lk/index.php/Welcome/searchResults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
        signal: AbortSignal.timeout(6000)
      });

      if (!response.ok) return null;

      const html = await response.text();
      if (html.includes('Total Number of Results : 0')) return null;

      const results = parseIsbnLkHTML(html);
      return results.length > 0 ? results[0] : null;
    } catch (err) {
      console.warn(`Pattern check failed for ${hyp}:`, err.message);
      return null;
    }
  });

  const results = await Promise.all(fetchPromises);
  const matched = results.find(res => res !== null) || null;

  console.log(`Lookup finished in ${Date.now() - startTime}ms`);
  return matched;
}

async function runTest() {
  const res = await lookupSriLankanISBN(cleanIsbn);
  console.log('Result:', res);
}

runTest();
