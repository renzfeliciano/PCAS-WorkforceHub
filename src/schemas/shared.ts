import { z } from "zod";

/** PH mobile number: XXXX-XXX-XXXX (11 digits), always starting with "09" — pairs with formatContactNumber() in @/lib/input-mask. */
export const contactNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{3}-\d{4}$/, "Use format XXXX-XXX-XXXX");

/** Shared across every feature's email field for consistent validation and error messaging. */
export const emailSchema = z.string().trim().email("Enter a valid email").max(150);
