import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be less than 100 characters")

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
