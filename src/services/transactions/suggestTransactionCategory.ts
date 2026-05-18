export type SuggestedCategory = {
  category: string
  confidence: number // 0..1
}

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

export function suggestTransactionCategory(input: {
  description: string
  amount: number
  type: "receita" | "despesa"
}): SuggestedCategory {
  const d = norm(input.description)
  const amount = Math.abs(Number(input.amount) || 0)

  if (input.type === "receita") {
    if (/(salario|salario|pro labore|pagamento|folha)/.test(d)) return { category: "Salário", confidence: 0.9 }
    if (/(pix recebido|transferencia recebida|ted recebido|doc recebido)/.test(d)) return { category: "Transferência", confidence: 0.75 }
    return { category: "Outras receitas", confidence: 0.55 }
  }

  if (/(ifood|uber eats|restaurante|lanchonete|padaria|mercado|supermercado|carrefour|assai|atacadao)/.test(d)) {
    return { category: "Alimentação", confidence: 0.82 }
  }
  if (/(uber|99|combustivel|posto|ipiranga|shell|estacionamento|pedagio)/.test(d)) {
    return { category: "Transporte", confidence: 0.78 }
  }
  if (/(netflix|spotify|prime video|hbo|max|disney|assinatura)/.test(d)) {
    return { category: "Assinaturas", confidence: 0.8 }
  }
  if (/(farmacia|drogaria|hospital|clinica|consulta|medico|odont|dentista)/.test(d)) {
    return { category: "Saúde", confidence: 0.77 }
  }
  if (/(aluguel|condominio|luz|energia|agua|gas|internet|telefone)/.test(d)) {
    return { category: "Moradia", confidence: 0.75 }
  }

  if (amount <= 30 && /(taxa|tarifa|iof|juros)/.test(d)) return { category: "Taxas", confidence: 0.7 }
  return { category: "Outros", confidence: 0.52 }
}

