const Scraper = require("./Scraper");
const constants = require("./constants");
const express = require("express");
const app = express();
const port = 3000;
const fs = require('fs').promises;
const cors = require('cors');

app.use(cors());

const scraper = new Scraper();

const ScrapperService = async () => {
  await scraper.googleScraper();

  setInterval(async () => {
    await scraper.googleScraper();
  }, constants.minutesToGoogleScraper * 60000)
  
};

app.get("/", async (req, res) => {
  try {
    const jobs = scraper.gooogleJobs;
    return res.status(200).json(jobs);
  } catch (error) {
    return res.status(500).json({ message: "Algo deu errado." });
  }
});


app.get("/photo", async (req, res) => {
  try {
    const image = await fs.readFile('screenshot.jpg');
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    res.end(image, 'binary');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

ScrapperService();

app.listen(port, () => {
  console.log(`Application is alive! Scraping will start soon, can watch on https://localhost:${port}`);
});
