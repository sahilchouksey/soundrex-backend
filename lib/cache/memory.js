const cacheObject = require("./cache");

const HOUR_MS = 3600000;

class memory {
  static set = (k, id, data, exp) => {
    return new Promise((resolve, reject) => {
      cacheObject[k] = {
        exp: Date.now() + exp * HOUR_MS || HOUR_MS,
        id: id,
        data: data,
      };
      console.log("Cache Miss", id);
      resolve(data);
    });
    // await client.setAsync(k, filteredData, 'EX', );
  };

  static get = (k, id) => {
    return new Promise((resolve, reject) => {
      try {
        // if (!cacheObject.hasOwnProperty(k)) {
        //   throw new Error("cache not found");
        // }
        console.log("Cache Hit", id);

        resolve(cacheObject?.[k]?.id === id ? cacheObject?.[k]?.data : false);
      } catch (err) {
        reject(err);
      }
    });
  };
}

module.exports = memory;
