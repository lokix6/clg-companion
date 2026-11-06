import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z
  .object({
    full_name: z.string().trim().min(2, "Full name is required").max(120),
    email: z.string().trim().email("Enter a valid email").max(255),
    college_name: z.string().trim().min(2, "College name is required").max(180),
    branch: z.string().trim().min(1, "Select your branch"),
    semester: z.string().min(1, "Select semester"),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

export const forgotSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
});

export const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
