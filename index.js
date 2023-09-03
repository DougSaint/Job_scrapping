const Scraper = require("./Scraper");
const constants = require("./constants");
const express = require("express");
const app = express();
const port = 3000;

const scraper = new Scraper();

const ScrapperService = async () => {
  await scraper.googleScraper();
  await scraper.linkedinScraper();

  setInterval(async () => {
    await scraper.googleScraper();
  }, constants.minutesToGoogleScraper * 60000)
  
  setInterval(async () => {
    await scraper.linkedinScraper();
  }, constants.minutesToLinkedinScraper * 60000)
};

app.get("/", async (req, res) => {
  try {
    const jobs = [{
      googleJobs: scraper.gooogleJobs,
      linkedinJobs: scraper.linkedinJobs
    }]
    return res.status(200).json(jobs);
  } catch (error) {
    return res.status(500).json({ message: "Algo deu errado." });
  }
});

app.get("/linkedin-jobs", async (req, res) => {
  const jobs =  scraper.linkedinJobs;
  return res.status(200).json(jobs);
});

app.get("/google-jobs", async (req, res) => {
  const jobs = scraper.gooogleJobs;
  return res.status(200).json(jobs);
});

ScrapperService();

app.listen(port, () => {
  console.log(`Application is alive! Scraping will start soon`);
});
