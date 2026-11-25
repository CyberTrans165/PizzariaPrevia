// Esquemas de entrada (zod), usados pelo formulário do site e conferidos de novo no servidor.

import { z } from "zod";
import { MAX_ITEMS, MAX_ITEM_NOTE, MAX_QUANTITY } from "./pricing.ts";

const id = z.string().uuid();

/** Telefone brasileiro: só dígitos, DDD + 8 ou 9 dígitos. Aceita máscara na entrada. */
export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, ""))
  .refine((v) => /^[1-9][1-9]\d{8,9}$/.test(v), { message: "Informe um telefone com DDD." });

export const cepSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 8, { message: "CEP deve ter 8 números." });

const text = (min: number, max: number, label: string) =>
  z
    .string()
    .transform((v) => v.replace(/\s+/g, " ").trim())
    .refine((v) => v.length >= min, { message: `Informe ${label}.` })
    .refine((v) => v.length <= max, { message: `${label} muito longo.` });

export const addressSchema = z.object({
  cep: cepSchema,
  street: text(2, 120, "a rua"),
  number: text(1, 12, "o número"),
  complement: z.string().max(60).optional().default(""),
  district: text(2, 80, "o bairro"),
  city: text(2, 80, "a cidade"),
  uf: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .refine((v) => /^[A-Z]{2}$/.test(v), { message: "UF inválida." }),
});
export type AddressInput = z.infer<typeof addressSchema>;

const pizzaItem = z.object({
  kind: z.literal("pizza"),
  sizeId: id,
  flavorIds: z.array(id).min(1).max(3),
  crustId: id.nullable().optional(),
  addonIds: z.array(id).max(10).optional(),
  removedIngredients: z.array(z.string().max(60)).max(20).optional(),
  note: z.string().max(MAX_ITEM_NOTE).optional(),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
});

const productItem = z.object({
  kind: z.literal("product"),
  productId: id,
  note: z.string().max(MAX_ITEM_NOTE).optional(),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
});

export const cartItemSchema = z.discriminatedUnion("kind", [pizzaItem, productItem]);

export const createOrderSchema = z
  .object({
    idempotencyKey: id,
    items: z.array(cartItemSchema).min(1).max(MAX_ITEMS),
    fulfillment: z.enum(["delivery", "pickup"]),
    customer: z.object({
      name: text(2, 80, "o nome"),
      phone: phoneSchema,
    }),
    address: addressSchema.optional(),
    paymentMethod: z.enum(["pix", "cash", "card_on_delivery"]),
    /** troco para quanto, em centavos (só dinheiro) */
    cashChangeForCents: z.number().int().positive().max(100_000_00).optional(),
    notes: z.string().max(500).optional().default(""),
    /** caixa única de aceite de dados + atualizações por WhatsApp (ETAPA 7) */
    consent: z.literal(true, { errorMap: () => ({ message: "É preciso aceitar para continuar." }) }),
    consentTextVersion: z.number().int().positive(),
    turnstileToken: z.string().min(1).max(4096),
  })
  .superRefine((v, ctx) => {
    if (v.fulfillment === "delivery" && !v.address) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["address"], message: "Informe o endereço de entrega." });
    }
    if (v.cashChangeForCents !== undefined && v.paymentMethod !== "cash") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cashChangeForCents"], message: "Troco só para pagamento em dinheiro." });
    }
  });
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const deliveryQuoteSchema = z.object({
  address: addressSchema,
  subtotalCents: z.number().int().min(0).max(100_000_00),
});
