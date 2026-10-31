import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { PrismaClient, TaskStatus } from "@prisma/client";
import { getAddress, isAddress, verifyMessage } from "viem";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.API_PORT ?? 4000);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const sessionDays = 7;

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: webOrigin, credentials: true }));
app.use(express.json({ limit: "256kb" }));
app.use(cookieParser());
app.use("/api", rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));
app.use("/api/auth", rateLimit({ windowMs: 60_000, limit: 15, standardHeaders: true, legacyHeaders: false }));

const cookieName = process.env.NODE_ENV === "production" ? "__Host-skillmint_session" : "skillmint_session";
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

type AuthRequest = express.Request & { userId?: string; wallet?: string };
async function requireSession(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  try {
    const raw = req.cookies?.[cookieName] as string | undefined;
    if (!raw) { res.status(401).json({ error: "AUTH_REQUIRED" }); return; }
    const session = await prisma.session.findUnique({ where: { tokenHash: sha256(raw) }, include: { user: true } });
    if (!session || session.expiresAt <= new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      res.clearCookie(cookieName, cookieOptions).status(401).json({ error: "SESSION_EXPIRED" }); return;
    }
    req.userId = session.userId;
    req.wallet = session.user.wallet;
    next();
  } catch (error) { next(error); }
}

const nonceSchema = z.object({ wallet: z.string().refine(isAddress, "Invalid EVM address") });
app.post("/api/auth/nonce", async (req, res, next) => {
  try {
    const parsed = nonceSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "INVALID_INPUT", details: parsed.error.flatten() }); return; }
    const wallet = getAddress(parsed.data.wallet).toLowerCase();
    const nonce = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60_000);
    const challenge = await prisma.sessionNonce.create({ data: { wallet, nonce, expiresAt } });
    const domain = process.env.AUTH_DOMAIN ?? "localhost";
    const message = `SkillMint wants you to sign in with your wallet:\n${wallet}\n\nSign in to SkillMint. This request will not trigger a blockchain transaction.\n\nDomain: ${domain}\nNonce: ${nonce}\nIssued At: ${challenge.createdAt.toISOString()}\nExpiration Time: ${challenge.expiresAt.toISOString()}`;
    res.json({ nonce, message, expiresAt: challenge.expiresAt.toISOString() });
  } catch (error) { next(error); }
});

const verifySchema = z.object({ wallet: z.string().refine(isAddress), nonce: z.string().min(20), signature: z.string().regex(/^0x[0-9a-fA-F]+$/) });
app.post("/api/auth/verify", async (req, res, next) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "INVALID_INPUT", details: parsed.error.flatten() }); return; }
    const wallet = getAddress(parsed.data.wallet).toLowerCase();
    const challenge = await prisma.sessionNonce.findUnique({ where: { nonce: parsed.data.nonce } });
    if (!challenge || challenge.wallet !== wallet || challenge.consumedAt || challenge.expiresAt <= new Date()) {
      res.status(401).json({ error: "INVALID_OR_EXPIRED_NONCE" }); return;
    }
    const message = `SkillMint wants you to sign in with your wallet:\n${wallet}\n\nSign in to SkillMint. This request will not trigger a blockchain transaction.\n\nDomain: ${process.env.AUTH_DOMAIN ?? "localhost"}\nNonce: ${challenge.nonce}\nIssued At: ${challenge.createdAt.toISOString()}\nExpiration Time: ${challenge.expiresAt.toISOString()}`;
    const valid = await verifyMessage({ address: getAddress(wallet), message, signature: parsed.data.signature as `0x${string}` });
    if (!valid) { res.status(401).json({ error: "INVALID_SIGNATURE" }); return; }

    const result = await prisma.$transaction(async tx => {
      const consumed = await tx.sessionNonce.updateMany({ where: { id: challenge.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
      if (consumed.count !== 1) throw new Error("NONCE_ALREADY_CONSUMED");
      const user = await tx.user.upsert({ where: { wallet }, create: { wallet }, update: {} });
      const rawToken = randomBytes(32).toString("base64url");
      await tx.session.create({ data: { tokenHash: sha256(rawToken), userId: user.id, expiresAt: new Date(Date.now() + sessionDays * 86400_000) } });
      return { user, rawToken };
    });
    res.cookie(cookieName, result.rawToken, { ...cookieOptions, maxAge: sessionDays * 86400_000 }).json({ user: { id: result.user.id, wallet: result.user.wallet, displayName: result.user.displayName } });
  } catch (error) { next(error); }
});

app.post("/api/auth/logout", async (req, res, next) => {
  try {
    const raw = req.cookies?.[cookieName] as string | undefined;
    if (raw) await prisma.session.deleteMany({ where: { tokenHash: sha256(raw) } });
    res.clearCookie(cookieName, cookieOptions).status(204).end();
  } catch (error) { next(error); }
});

app.get("/api/me", requireSession, async (req: AuthRequest, res, next) => {
  try { const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { id: true, wallet: true, displayName: true, bio: true, skills: true, portfolio: true } }); res.json({ user }); }
  catch (error) { next(error); }
});

const taskCreateSchema = z.object({ title: z.string().trim().min(8).max(120), description: z.string().trim().min(30).max(10000), category: z.string().trim().min(2).max(60), skills: z.array(z.string().trim().min(1).max(40)).max(12), budgetBaseUnits: z.string().regex(/^[1-9][0-9]{0,77}$/), tokenAddress: z.string().refine(isAddress).optional(), deadline: z.string().datetime().optional() });
app.get("/api/tasks", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    const category = typeof req.query.category === "string" ? req.query.category.slice(0, 60) : undefined;
    const tasks = await prisma.task.findMany({ where: { status: TaskStatus.OPEN, ...(category && category !== "ALL WORK" ? { category } : {}), ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }, { skills: { has: q } }] } : {}) }, orderBy: { createdAt: "desc" }, take: 50, include: { client: { select: { id: true, wallet: true, displayName: true } } } });
    res.json({ tasks });
  } catch (error) { next(error); }
});

app.post("/api/tasks", requireSession, async (req: AuthRequest, res, next) => {
  try {
    const parsed = taskCreateSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "INVALID_INPUT", details: parsed.error.flatten() }); return; }
    const data = parsed.data;
    const task = await prisma.task.create({ data: { publicId: `SM-${randomBytes(4).toString("hex").toUpperCase()}`, clientId: req.userId!, title: data.title, description: data.description, category: data.category, skills: data.skills, budgetBaseUnits: data.budgetBaseUnits, tokenAddress: data.tokenAddress?.toLowerCase(), deadline: data.deadline ? new Date(data.deadline) : undefined, status: TaskStatus.OPEN } });
    res.status(201).json({ task });
  } catch (error) { next(error); }
});

app.get("/health", (_req, res) => res.json({ status: "ok", service: "skillmint-api" }));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("request_error", error instanceof Error ? error.message : "unknown");
  res.status(500).json({ error: "INTERNAL_ERROR" });
});

const server = app.listen(port, () => console.info(`SkillMint API listening on :${port}`));
async function shutdown() { server.close(); await prisma.$disconnect(); }
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
