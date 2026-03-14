import dotenv from "dotenv";
import { getJwtSecret } from "./config.js";

dotenv.config({ path: new URL("../../../.env", import.meta.url).pathname });

const JWT_SECRET = getJwtSecret();

import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { middleware } from "./middleware.js";
import {
  CreateUserSchema,
  SigninSchema,
  CreateRoomSchema,
} from "@repo/common/types";
import { prismaclient } from "@repo/db";
import bcrypt from "bcryptjs";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:4000"],
    credentials: true,
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/signup", async (req, res) => {
  const parsed = CreateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid input",
      errors: parsed.error.issues,
    });
  }

  const { email, password, name } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existing = await prismaclient.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 12);

    const created = await prismaclient.user.create({
      data: {
        email: normalizedEmail,
        password: hashed,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    const token = jwt.sign(
      { userId: created.id, email: created.email },
      JWT_SECRET,
      { expiresIn: "1h" },
    );

    return res.status(201).json({
      message: "User created",
      token,
      user: created,
    });
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "P2002"
    ) {
      return res.status(409).json({ message: "Email already exists" });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/signin", async (req, res) => {
  const parsed = SigninSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid input",
      errors: parsed.error.issues,
    });
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await prismaclient.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const correct = await bcrypt.compare(password, user.password);
    if (!correct) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status(200).json({
      message: "Signed in",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    console.error("Signin error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/room", middleware, async (req, res) => {
  const parsed = CreateRoomSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid request ",
      errors: parsed.error.issues,
    });
  }

  const { slug } = parsed.data;

  try {
    const room = await prismaclient.room.create({
      data: {
        slug,
        adminId: req.userId,
      },
      select: {
        id: true,
        slug: true,
        createdAt: true,
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: "Room created",
      room,
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Room already exists" });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/room/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    const room = await prismaclient.room.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        createdAt: true,
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    return res.status(200).json({ room });
  } catch (err) {
    console.error("Get room error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/room/:slug/drawing", async (req, res) => {
  const { slug } = req.params;

  try {
    const room = await prismaclient.room.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const drawing = await prismaclient.drawingState.findUnique({
      where: { roomId: room.id },
      select: { elements: true, updatedAt: true },
    });

    return res.status(200).json({
      elements: drawing?.elements ?? [],
      updatedAt: drawing?.updatedAt ?? null,
    });
  } catch (err) {
    console.error("Get drawing error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/room/:slug/drawing", middleware, async (req, res) => {
  const { slug } = req.params;
  const { elements } = req.body;

  if (!Array.isArray(elements)) {
    return res.status(400).json({ message: "Elements must be an array" });
  }

  try {
    const room = await prismaclient.room.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const drawing = await prismaclient.drawingState.upsert({
      where: { roomId: room.id },
      create: {
        roomId: room.id,
        elements,
      },
      update: {
        elements,
      },
      select: { updatedAt: true },
    });

    return res.status(200).json({ updatedAt: drawing.updatedAt });
  } catch (err) {
    console.error("Save drawing error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(4001, () => {
  console.log("HTTP server is running on port 4001");
});
