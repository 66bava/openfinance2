import { motion } from "motion/react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion"

const faqs = [
  {
    q: "Preciso de cartão de crédito para o trial?",
    a: "Não. O trial de 14 dias é 100% grátis, sem pedir cartão ou dados de pagamento. Você só é cobrado se decidir continuar após o trial.",
  },
  {
    q: "Como funciona o Score de Saúde Financeira?",
    a: "Nosso algoritmo analisa 7 pilares: reserva de emergência, taxa de poupança, diversificação de renda, nível de endividamento, consistência dos registros, liquidez e cumprimento de metas. O resultado é um número de 0 a 1000 que resume sua saúde financeira em tempo real.",
  },
  {
    q: "A IA tem acesso aos meus dados pessoais?",
    a: "A IA processa apenas números agregados e categorias — nunca dados pessoais identificáveis. Os textos dos relatórios são gerados com base em padrões financeiros anonimizados. Seus dados ficam no Supabase com criptografia em repouso e isolamento por usuário (Row Level Security).",
  },
  {
    q: "Tem app mobile?",
    a: "Sim! O Openfy é um Progressive Web App (PWA) — você instala diretamente do navegador, fica na tela inicial e funciona como um app nativo. Apps nativos iOS e Android estão previstos para o segundo semestre de 2026.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, sem multa, sem burocracia e sem período de carência. Ao cancelar, você mantém acesso até o fim do ciclo pago. Seus dados ficam disponíveis para exportação por 30 dias, depois são removidos completamente.",
  },
  {
    q: "Como funciona o Plano Família?",
    a: "Uma assinatura única de R$ 34,90/mês para até 4 membros. Cada pessoa tem seu perfil independente com dados privados — ninguém vê os dados de ninguém. O administrador tem acesso a um painel consolidado com visão geral da família.",
  },
  {
    q: "Vocês vendem ou compartilham meus dados?",
    a: "Nunca. Nosso modelo de negócio é exclusivamente por assinatura. Seus dados financeiros não são vendidos, compartilhados ou usados para publicidade. Estamos em conformidade total com a LGPD.",
  },
]

export default function FAQ() {
  return (
    <section
      id="faq"
      style={{
        backgroundColor: "#FFFFFF",
        padding: "96px 24px",
        fontFamily: "var(--font-body)",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 56 }}
        >
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#16A34A",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            display: "block",
            marginBottom: 16,
          }}>
            Perguntas
          </span>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(28px, 3.5vw, 44px)",
            fontWeight: 700,
            color: "#0A0A0A",
            letterSpacing: "-0.025em",
          }}>
            Dúvidas frequentes
          </h2>
        </motion.div>

        <Accordion type="single" collapsible>
          {faqs.map((faq, i) => (
            <motion.div
              key={faq.q}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <AccordionItem
                value={`item-${i}`}
                style={{ borderBottom: "1px solid #E5E5E3" }}
              >
                <AccordionTrigger
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#0A0A0A",
                    textAlign: "left",
                    padding: "20px 0",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent
                  style={{
                    fontSize: 15,
                    color: "#525252",
                    lineHeight: 1.7,
                    paddingBottom: 20,
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
