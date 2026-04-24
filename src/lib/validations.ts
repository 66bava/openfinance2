import { z } from "zod"

export const emailSchema = z
  .string()
  .min(1, "E-mail é obrigatório")
  .email("E-mail inválido")

export const senhaSchema = z
  .string()
  .min(8, "Senha deve ter pelo menos 8 caracteres")
  .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
  .regex(/[0-9]/, "Senha deve conter pelo menos um número")

export const nomeSchema = z
  .string()
  .min(2, "Nome deve ter pelo menos 2 caracteres")
  .max(100, "Nome muito longo")

export const valorSchema = z
  .string()
  .refine((v) => {
    const num = parseInt(v.replace(/\D/g, ""), 10)
    return !isNaN(num) && num > 0
  }, "Informe um valor válido maior que zero")

export const telefoneSchema = z
  .string()
  .optional()
  .refine(
    (v) => !v || /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(v.replace(/\s/g, "")),
    "Telefone inválido. Ex: (11) 99999-0000"
  )

export const loginSchema = z.object({
  email: emailSchema,
  senha: senhaSchema,
})

export const cadastroSchema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  senha: senhaSchema,
  telefone: telefoneSchema,
})

export const perfilSchema = z.object({
  nome: nomeSchema,
  telefone: telefoneSchema,
})

export const despesaSchema = z.object({
  valor: valorSchema,
  categoria: z.string().min(1, "Selecione uma categoria"),
  data: z.string().min(1, "Selecione uma data"),
})
