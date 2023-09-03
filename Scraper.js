const unirest = require("unirest");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const cheerio = require("cheerio");
const constants = require("./constants");

class Scraper {
  gooogleJobs = [];
  linkedinJobs = [];
  currentlyScrapingLinkedin = false;
  currentlyScrapingGoogle = false;

  googleScraper = async () => {
    const googleJobsUrl = `https://www.google.com/search?client=opera-gx&q=${constants.googleQuery}&sourceid=opera&ie=UTF-8&oe=UTF-8&ibp=htl;jobs&sa=X&ved=2ahUKEwifkerhyY2BAxVPH7kGHZeDDPYQudcGKAF6BAgXECs&sxsrf=AB5stBhvImrhn6Po9rw_bkdYNkihD6JEcg:1693714384330#fpstate=tldetail&htivrt=jobs&htichips=date_posted:3days&htischips=date_posted;3days&htidocid=iCTgQFNhw5sAAAAAAAAAAA%3D%3D`
    if(this.currentlyScrapingGoogle) return;
    this.currentlyScrapingGoogle = true;
    try {
      puppeteer.use(StealthPlugin());
      const browser = await puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage'
        ],
      });
      const page = await browser.newPage();

      await page.goto(googleJobsUrl);

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
            }, 500);
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
            if (text.startsWith("Acesse")) return true;
          })
          ?.attr("href")
          ?.split("?")?.[0];

        const companyAndLocation = $(element)
          ?.children()
          ?.first()
          ?.children()
          ?.first()
          ?.children()
          ?.first()
          ?.children()
          ?.eq(1)
          ?.children()
          ?.eq(1);

        const hasdescription = $(element)?.text()?.includes("Trabalho de casa");

        const description = hasdescription
          ? $(element)
              ?.text()
              ?.split("Trabalho de casa")?.[1]
              ?.split("Denunciar este anúncio")[0]
          : $(element)
              ?.text()
              ?.split("Trabalho remoto")?.[1]
              ?.split("Denunciar este anúncio")[0];

        jobs.push({
          company: companyAndLocation?.children()?.first()?.text(),
          description,
          title,
          applyLink,
        });
      });

      await browser.close();
      console.log('google scraper finished')
      this.currentlyScrapingGoogle = false;
      this.gooogleJobs = jobs;
    } catch (e) {
      console.log(e);
    }
  };

  linkedinScraper = async () => {
    if(this.currentlyScrapingLinkedin) return;
    this.currentlyScrapingLinkedin = true;
    try {
      let range = 3;
      let pageNum = 0;
      let jobs_data = [];
      for (let i = 0; i < range; i++) {
        let url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${constants.linkedinKeyWord}&location=Brasil&locationId=&geoId=106057199&f_TPR=r86400&f_WT=1%2C2%2C3&position=1&start=${pageNum}`;
        let response = await unirest.get(url).headers({
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36",
        });

        const $ = cheerio.load(response.body);

        $(".job-search-card").each(async (i, el) => {
          jobs_data.push({
            title: $(el).find(".base-search-card__title").text()?.trim(),
            company: $(el).find("h4.base-search-card__subtitle").text()?.trim(),
            link: $(el).find("a.base-card__full-link").attr("href")?.trim(),
            id: $(el).attr("data-entity-urn")?.split("urn:li:jobPosting:")[1],
            location: $(el).find(".job-search-card__location").text()?.trim(),
            date: $(el).find(".job-search-card__listdate").text()?.trim(),
          });
        });
      }

      for (let j = 0; j < jobs_data.length; j++) {
        let url2 = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobs_data[j].id}`;

        let response2 = await unirest.get(url2).headers({
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36",
        });
        const $2 = cheerio.load(response2.body);

        let level = $2("li.description__job-criteria-item:nth-child(1) span")
          .text()
          .trim();

        let type = $2("li.description__job-criteria-item:nth-child(2) span")
          .text()
          .trim();
        let jobDescription = $2(".show-more-less-html__markup").html();
        jobDescription = jobDescription
          ?.replaceAll("<br>", "\n")
          ?.replaceAll("<ul>", "\n")
          ?.replaceAll("<li>", "*")
          ?.replaceAll("</li>", "\n")
          ?.replaceAll("</ul>", "\n");

        jobs_data[j].jobDescription = jobDescription;
        jobs_data[j].level = level;
        jobs_data[j].type = type;
      }
      this.currentlyScrapingLinkedin = false;
      this.linkedinJobs = jobs_data;
      console.log('linkedin scraper finished')
    } catch (e) {
      console.log(e);
    }
  };
}

module.exports = Scraper;
