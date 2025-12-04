import cors from "cors";

const corsOptions = {

  origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:7200", "http://localhost:7201", "https://bms.maktg.com"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization",'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
};

const corsConfig = cors(corsOptions);
export default corsConfig;
