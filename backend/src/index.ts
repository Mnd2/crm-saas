import express from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env";
import authRoutes from "./routes/auth";
import contactsRoutes from "./routes/contacts";
import dealsRoutes from "./routes/deals";
import activitiesRoutes from "./routes/activities";
import organizationsRoutes from "./routes/organizations";
import usersRoutes from "./routes/users";
import analyticsRoutes from "./routes/analytics";
import aiRoutes from "./routes/ai";
import prestashopRoutes from "./routes/prestashop";
import emailRoutes from "./routes/email";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/contacts", contactsRoutes);
app.use("/api/v1/deals", dealsRoutes);
app.use("/api/v1/activities", activitiesRoutes);
app.use("/api/v1/organizations", organizationsRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/prestashop", prestashopRoutes);
app.use("/api/v1/email", emailRoutes);

app.listen(env.PORT, () => {
  console.log(`Backend running on port ${env.PORT}`);
});
