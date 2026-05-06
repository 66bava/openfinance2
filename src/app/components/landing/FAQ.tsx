import { motion } from "motion/react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion"
import { useLanguage } from "../../../lib/language-context"

export default function FAQ() {
  const { t } = useLanguage()

  const faqs = [
    { q: t("faq8Q"), a: t("faq8A") },
    { q: t("faq9Q"), a: t("faq9A") },
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq2Q"), a: t("faq2A") },
    { q: t("faq3Q"), a: t("faq3A") },
    { q: t("faq4Q"), a: t("faq4A") },
    { q: t("faq5Q"), a: t("faq5A") },
    { q: t("faq6Q"), a: t("faq6A") },
    { q: t("faq7Q"), a: t("faq7A") },
  ]

  return (
    <section id="faq" style={{ backgroundColor: "var(--of-surface)", padding: "96px 24px", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 56 }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: "#16A34A", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 16 }}>
            {t("faqTag")}
          </span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 700, color: "var(--of-text)", letterSpacing: "-0.025em" }}>
            {t("faqH2")}
          </h2>
        </motion.div>

        <Accordion type="single" collapsible>
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <AccordionItem value={`item-${i}`} style={{ borderBottom: "1px solid var(--of-border)" }}>
                <AccordionTrigger style={{ fontSize: 15, fontWeight: 600, color: "var(--of-text)", textAlign: "left", padding: "20px 0", fontFamily: "var(--font-body)" }}>
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent style={{ fontSize: 15, color: "var(--of-text-secondary)", lineHeight: 1.7, paddingBottom: 20, fontFamily: "var(--font-body)" }}>
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
