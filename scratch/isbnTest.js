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

// Simple HTML row parser using regex
function parseIsbnLkHTML(html) {
  // Look for result table rows
  // Columns in order: Publisher Name, Title of the Book, Author Name, ISBN, Date of Issue, Book Type, Image
  const rows = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  
  while ((match = trRegex.exec(html)) !== null) {
    const rowHtml = match[1];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const tds = [];
    let tdMatch;
    
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      // Strip html tags and trim
      const cellText = tdMatch[1].replace(/<[^>]*>/g, '').trim();
      tds.push(cellText);
    }
    
    if (tds.length >= 5) {
      // Avoid table headers
      if (tds[0].toLowerCase().includes('publisher name') || tds[1].toLowerCase().includes('title of the book')) {
        continue;
      }
      rows.push({
        publisher: tds[0],
        title: tds[1],
        author: tds[2],
        isbn: tds[3],
        issueDate: tds[4],
        publishedYear: tds[4] ? tds[4].split('-')[0] : ''
      });
    }
  }
  return rows;
}

async function runTest() {
  const hyphenations = getSriLankanISBNHyphenations(cleanIsbn);
  console.log('Testing patterns:', hyphenations);

  for (const hyp of hyphenations) {
    console.log(`Querying pattern: ${hyp}...`);
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
        body: bodyParams.toString()
      });

      const html = await response.text();
      
      if (html.includes('Total Number of Results : 0')) {
        console.log('-> No results found for this pattern.');
        continue;
      }

      const results = parseIsbnLkHTML(html);
      if (results.length > 0) {
        console.log('-> Success! Found results:', results);
        return;
      }
    } catch (err) {
      console.error(`Error querying ${hyp}:`, err.message);
    }
  }
  console.log('No results found for any pattern.');
}

runTest();
