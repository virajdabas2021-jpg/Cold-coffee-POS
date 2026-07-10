import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser to receive JSON payload
  app.use(express.json());

  // API Route: GET global Supabase database configuration
  app.get("/api/db-config", (req, res) => {
    return res.json({
      url: "https://nrxcaimqmuqtlsepmrhh.supabase.co",
      key: "sb_publishable_PckCD6vpwFsR2ESWG1T3KA_J-_uQTpJ"
    });
  });

  // API Route: POST/Save global Supabase database configuration
  app.post("/api/db-config", (req, res) => {
    return res.json({ success: true });
  });

  // Vite middleware for development, static assets for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
