const PORT = process.env.PORT || 8080;
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();

// const { client } = require("./lib/redis");
const deleteCacheCron = require("./lib/services");
const pipedHealthService = require("./lib/pipedHealthService");
const { getProxyYtdlExtractor } = require("./helper/extractYoutube");
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const songRoutes = require("./routes/song");

app.use(
  cors({
    origin: function (origin, callback) {
      console.log('🌐 CORS Origin Request:', origin || 'No origin (likely same-origin or server-to-server)');

      // Allow requests with no origin (like mobile apps, curl requests, or same-origin)
      if (!origin) return callback(null, true);

      // For development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Development mode: Allowing origin:', origin);
        return callback(null, true);
      }

      // In production, you should specify allowed origins
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'https://localhost:3000',
        'https://localhost:3001',
        'https://soundrex.netlify.app',
        'http://soundrex.netlify.app',
        // Add your production domains here
      ];

      if (allowedOrigins.includes(origin)) {
        console.log('✅ Allowed origin:', origin);
        return callback(null, true);
      }

      // For now, allow all origins (you should restrict this in production)
      console.log('⚠️  Unknown origin allowed:', origin);
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'X-Access-Token',
      'X-Key',
      'If-Modified-Since',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Methods',
      'X-Forwarded-For',
      'X-Real-IP'
    ],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar', 'Content-Type'],
    optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
    preflightContinue: false // Pass control to the next handler
  }),
);

// app.set("Access-Control-Allow-Origin", "http://localhost:3000");

// Handle preflight requests explicitly
app.options('*', cors());

// Additional CORS debugging middleware
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);

  // Add additional CORS headers as fallback
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH,HEAD');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-Access-Token, X-Key, If-Modified-Since');

  if (req.method === 'OPTIONS') {
    console.log('🔄 Handling preflight OPTIONS request');
    res.status(200).end();
    return;
  }

  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api/v1", apiRoutes);
app.use("/auth", authRoutes);
app.use("/soundrex", songRoutes);

app.use((error, req, res, next) => {
  const message = error.message.toLowerCase().includes("mongodb")
    ? "Opps! something went wrong.  "
    : error.message || "Something went wrong.";
  const status = error.statusCode || 500;
  console.log(error);
  return res.status(status).json({ message, status });
});

deleteCacheCron();

mongoose
  .connect(process.env.MONGODB_SERVER)
  .then(() => {
    app.listen(PORT, () => {
      console.log("starting server");
      // client.flushall();
      console.log("Server is listing to port: " + PORT);

      // Start Piped health monitoring service
      setTimeout(() => {
        console.log("🚀 Starting Piped health monitoring service...");
        pipedHealthService.start();
      }, 5000); // Wait 5 seconds after server start

      // Initialize proxy service
      setTimeout(async () => {
        try {
          console.log("🔧 Initializing Proxy Service...");
          const proxyExtractor = getProxyYtdlExtractor();
          await proxyExtractor.initialize();
          console.log("✅ Proxy Service initialized successfully");

          // Schedule periodic proxy refresh (every 30 minutes)
          setInterval(async () => {
            try {
              console.log("🔄 Scheduled proxy refresh...");
              await proxyExtractor.refreshProxies();
              console.log("✅ Scheduled proxy refresh completed");
            } catch (error) {
              console.error("❌ Scheduled proxy refresh failed:", error.message);
            }
          }, 30 * 60 * 1000); // 30 minutes

        } catch (error) {
          console.error("❌ Failed to initialize Proxy Service:", error.message);
        }
      }, 8000); // Wait 8 seconds after server start
    });
  })
  .catch((err) => console.log(err));
