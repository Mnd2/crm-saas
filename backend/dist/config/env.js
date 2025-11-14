"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    PORT: Number(process.env.PORT) || 4000,
    JWT_SECRET: process.env.JWT_SECRET || "changeme",
    DATABASE_URL: process.env.DATABASE_URL || "",
    EMAIL_FROM: process.env.EMAIL_FROM || "",
    EMAIL_SMTP_HOST: process.env.EMAIL_SMTP_HOST || "",
    EMAIL_SMTP_PORT: Number(process.env.EMAIL_SMTP_PORT) || 587,
    EMAIL_SMTP_USER: process.env.EMAIL_SMTP_USER || "",
    EMAIL_SMTP_PASSWORD: process.env.EMAIL_SMTP_PASSWORD || "",
    GROQ_API_KEY: process.env.GROQ_API_KEY || "",
    GROQ_MODEL: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
};
