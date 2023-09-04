const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const cheerio = require("cheerio");

require("dotenv").config();

class Scraper {
  gooogleJobs = [];
  currentlyScrapingGoogle = false;

  googleScraper = async () => {
    const googleJobsUrl = `https://www.google.com.br/search?q=(desenvolvedor+|+programador)+(front-end+|+front+end)+remoto+contratando+|+procurando+brasil&sca_esv=562432527&source=hp&ei=s1f1ZOWYOb6A9u8PlZGByAU&iflsig=AD69kcEAAAAAZPVlw3Ywn8w1JvWomVnny-qr_2Ars_vD&uact=5&oq=(desenvolvedor+%7C+programador)+(front-end+%7C+front+end)+remoto+contratando+%7C+procurando+%7C+brasil&gs_lp=Egdnd3Mtd2l6Il4oZGVzZW52b2x2ZWRvciB8IHByb2dyYW1hZG9yKSAoZnJvbnQtZW5kIHwgZnJvbnQgZW5kKSByZW1vdG8gY29udHJhdGFuZG8gfCBwcm9jdXJhbmRvIHwgYnJhc2lsSPiaAVDUlgFY1JYBcAB4AJABAJgBggKgAYICqgEDMi0xuAEDyAEA-AEC-AEBqAIA&sclient=gws-wiz&ibp=htl;jobs&sa=X&ved=2ahUKEwi4kMqYipCBAxWLiP0HHRnfD8gQudcGKAF6BAgTEBY#fpstate=tldetail&htivrt=jobs&htidocid=gtqo4D6IeF0AAAAAAAAAAA%3D%3D`;
    if (this.currentlyScrapingGoogle) return;
    console.log(googleJobsUrl)
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
      //make wait 10 seconds

      async function delay(time) {
        return new Promise(function (resolve) {
          setTimeout(resolve, time);
        });
      }
      await delay(50000);

      await page.screenshot({
        path: "screenshot.jpg",
      });
      console.log("screenshot taken")

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
            }, 5000);
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

        const hasdescription = $(element)?.text()?.includes("Work from fome");

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
      console.log(`google scraper finished with: ${jobs.length}`);
      this.currentlyScrapingGoogle = false;
      this.gooogleJobs = jobs;
    } catch (e) {
      console.log(e);
    }
  };

}

module.exports = Scraper;
