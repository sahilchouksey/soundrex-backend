// const redis = require("redis");

// // Connect to the Azure Cache for Redis over the TLS port using the key.
// const client = redis.createClient(6380, process.env.REDISCACHEHOSTNAME, {
//   auth_pass: process.env.REDISCACHEKEY,
//   tls: { servername: process.env.REDISCACHEHOSTNAME },
// });

// class redis_client {
//   static set = async (k, data, exp) => {
//     const filteredData = JSON.stringify(data);

//     return new Promise((resolve, reject) => {
//       client.setex(k, exp * 3600 || 3600, filteredData);
//       console.log("Cache Miss");
//       resolve(data);
//     });
//     // await client.setAsync(k, filteredData, 'EX', );
//   };

//   static get = async (k) => {
//     return new Promise((resolve, reject) => {
//       client.get(k, (error, data) => {
//         if (error) return reject(error);
//         if (data && data !== null) {
//           console.log("Cache Hit");
//           return resolve(JSON.parse(data));
//         }

//         return resolve(null);
//       });
//     });
//   };

//   static getOrSetCache = (k, cb, exp) => {
//     return new Promise((resolve, reject) => {
//       client.get(k, async (error, data) => {
//         if (error) return reject(error);
//         if (data && data !== null) {
//           console.log("Cache hit");
//           console.log("Long json string");
//           return resolve(JSON.parse(data));
//         }

//         const { data: newData } = await cb();

//         console.log("Cache miss");
//         console.log(newData);
//         client.setex(k, exp || 3600, JSON.stringify(newData));
//         resolve(newData);
//       });
//     });
//   };
// }

// module.exports = { redis_client, client };

//REDISCACHEHOSTNAME='soundrex.redis.cache.windows.net'
// REDISCACHEKEY='L9msTfdSGcI9SM9Sg7jhrp6WfEFoWQ0fwOOGY4Ea6L0='
