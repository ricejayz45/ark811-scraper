const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { ticket } = req.body;
  if (!ticket) {
    return res.status(400).json({ error: 'Ticket number is required' });
  }

  const url = `https://geocall.arkonecall.com/geocall/ShowTicketPosResponses?TicketNumber=${ticket}`;

  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    const data = await page.evaluate(() => {
      const table = document.querySelector('table');
      if (!table) return [];
      const rows = Array.from(table.querySelectorAll('tr')).slice(1);
      return rows.map(row => {
        const cells = row.querySelectorAll('td');
        return {
          utility: cells[0]?.innerText.trim(),
          status: cells[1]?.innerText.trim(),
          responseDate: cells[2]?.innerText.trim(),
          method: cells[3]?.innerText.trim(),
          message: cells[4]?.innerText.trim(),
        };
      });
    });

    await browser.close();
    res.json({ ticket, responses: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Scraping failed' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Scraper API running on port ${PORT}`);
});
