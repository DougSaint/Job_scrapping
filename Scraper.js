const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const cheerio = require("cheerio");

require("dotenv").config();

class Scraper {
  gooogleJobs = [];
  currentlyScrapingGoogle = false;

  googleScraper = async () => {
    const googleJobsUrl = `https://www.google.com/search?client=opera-gx&q=(desenvolvedor+|+programador)+(front-end+|+front+end+|+web)+remoto+|+brasil&sourceid=opera&ie=UTF-8&oe=UTF-8&ibp=htl;jobs&sa=X&ved=2ahUKEwifkerhyY2BAxVPH7kGHZeDDPYQudcGKAF6BAgXECs&sxsrf=AB5stBhvImrhn6Po9rw_bkdYNkihD6JEcg:1693714384330#fpstate=tldetail&htivrt=jobs&htidocid=TA8iq_HukbgAAAAAAAAAAA%3D%3D`;
    if (this.currentlyScrapingGoogle) return;
    console.log(googleJobsUrl);
    this.currentlyScrapingGoogle = true;
    try {
      puppeteer.use(StealthPlugin());
      const browser = await puppeteer.launch({
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--single-process",
          "--no-zygote",
        ],
        executablePath:
          process.env.NODE_ENV === "production"
            ? process.env.PUPPETEER_EXECUTABLE_PATH
            : puppeteer.executablePath(),
      });
      const page = await browser.newPage();
      await page.setViewport({
        width: 1920,
        height: 1080,
      });

      await page.goto(googleJobsUrl);


      async function delay(time) {
        return new Promise(function (resolve) {
          setTimeout(resolve, time);
        });
      }

      await delay(50000);

      await page.screenshot({
        path: "screenshot.jpg",
      });
      console.log("screenshot taken");

      async function autoScroll(page) {
        await page.evaluate(async () => {
          const wrapper = document.querySelector(
            ".gws-plugins-horizon-jobs__tl-lvc"
          );

          await new Promise((resolve, reject) => {
            let totalHeight = 0;
            let distance = 1000;
            let scrollDelay = 5000;

            let timer = setInterval(async () => {
              let scrollHeightBefore = wrapper.scrollHeight;
              wrapper.scrollBy(0, distance);
              totalHeight += distance;

              if (totalHeight >= scrollHeightBefore) {
                totalHeight = 0;
                await new Promise((resolve) =>
                  setTimeout(resolve, scrollDelay)
                );

                let scrollHeightAfter = wrapper.scrollHeight;
                if (scrollHeightAfter > wrapper.scrollHeight) {
                  return;
                } else {
                  clearInterval(timer);
                  resolve();
                }
              }
            }, 200);
          });
        });
      }

      await autoScroll(page);
      const html = await page.content();
      const $ = cheerio.load(html);
      const jobs = [];
      const detailSections = $("#gws-plugins-horizon-jobs__job_details_page");

      detailSections.each((index, element) => {
        const title = $(element)?.find("h2")?.first()?.text();
        const applyLink = $(element)
          ?.find("a")
          ?.filter((i, a) => {
            const text = $(a).text().trim();
            if (text.startsWith("Apply")) return true;
          })
          ?.attr("href")
          ?.split("?")?.[0];

        const companyImage = $(element)
          ?.children()
          ?.children()
          ?.children()
          ?.children()
          ?.eq(1)
          ?.find("img")
          ?.attr("src");

        const companyAndLocation = $(element)
          ?.children()
          ?.first()
          ?.children()
          ?.first()
          ?.children()
          ?.eq(1)
          ?.children()
          ?.eq(1);

        const jobDescription = $(element)
          ?.find("div")
          ?.filter((i, div) => {
            const text = $(div).text().trim();
            if (text.startsWith("Report")) return true;
          });

        const description = jobDescription.parent().children().eq(4).text();

        jobs.push({
          company: companyAndLocation?.children()?.first()?.text(),
          description,
          title,
          companyImage,
          applyLink,
        });
      });

      await browser.close();
      console.log(`google scraper finished with: ${jobs.length}`);
      this.currentlyScrapingGoogle = false;
      this.gooogleJobs = jobs;
    } catch (e) {
      console.log(e);
    }
  };
}

module.exports = Scraper;
