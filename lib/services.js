const cron = require("node-cron");

const cacheObject = require("./cache/cache");

const deleteExpiredCache = () => {
  for (const prop in cacheObject) {
    if (Date.now() > prop.exp) {
      props = null;
    }
  }
};

// cron.schedule("0 */1 * * *", () => {
const deleteCacheCron = () =>
  //cron.schedule("*/1 * * * *", () => {
  cron.schedule("0 */1 * * *", () => {
    deleteExpiredCache();
       console.log("checking expired cache every hour.");
    //console.log("checking expired cache every minute.");
  });

module.exports = deleteCacheCron;

//
