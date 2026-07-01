import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be less than 100 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
    "Password must include uppercase, lowercase, and a number",
  )

const finiteNumberSchema = z.number().finite();

const pointSchema = z.object({
  x: finiteNumberSchema,
  y: finiteNumberSchema,
});

const baseDrawingElementSchema = z.object({
  id: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value"),
  strokeWidth: z.number().finite().min(1).max(50),
});

const pathElementSchema = baseDrawingElementSchema.extend({
  type: z.literal("path"),
  points: z.array(pointSchema).min(1).max(5000),
});

const rectangleElementSchema = baseDrawingElementSchema.extend({
  type: z.literal("rectangle"),
  x: finiteNumberSchema,
  y: finiteNumberSchema,
  width: finiteNumberSchema,
  height: finiteNumberSchema,
});

const circleElementSchema = baseDrawingElementSchema.extend({
  type: z.literal("circle"),
  x: finiteNumberSchema,
  y: finiteNumberSchema,
  radius: z.number().finite().min(0).max(10000),
});

const lineElementSchema = baseDrawingElementSchema.extend({
  type: z.literal("line"),
  x1: finiteNumberSchema,
  y1: finiteNumberSchema,
  x2: finiteNumberSchema,
  y2: finiteNumberSchema,
});

const textElementSchema = baseDrawingElementSchema.extend({
  type: z.literal("text"),
  x: finiteNumberSchema,
  y: finiteNumberSchema,
  content: z.string().max(1000),
  fontSize: z.number().finite().min(1).max(200),
});

export const DrawingElementSchema = z.discriminatedUnion("type", [
  pathElementSchema,
  rectangleElementSchema,
  circleElementSchema,
  lineElementSchema,
  textElementSchema,
]);

export const DrawingPayloadSchema = z.object({
  elements: z.array(DrawingElementSchema).max(10000),
});

export type DrawingPayload = z.infer<typeof DrawingPayloadSchema>;

export const CreateUserSchema = z.object({
  email: z.email("Invalid email address"),
  password: passwordSchema,
  name: z.string().min(1, "Name is required").max(50, "Name is too long"),
});

export const SigninSchema = z.object({
  email: z.email("Invalid email address"),
  password: passwordSchema,
});

export const CreateRoomSchema = z.object({
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(20, "Slug must be less than 20 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
});

export const AddRoomMemberSchema = z.object({
  email: z.email("Invalid email address"),
});
