import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

type Plan = "free" | "pro" | "familia"

const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, familia: 2 }

export function useFeatureAccess(requiredPlan: Plan) {
  const [hasAccess, setHasAccess] = useState(false)
  const [userPlan, setUserPlan] = useState<Plan>("free")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: profile } = await supabase
        .from("profiles")
        .select("plano")
        .eq("id", user.id)
        .maybeSingle()

      const plan = ((profile?.plano as Plan) || "free")
      setUserPlan(plan)
      setHasAccess(PLAN_RANK[plan] >= PLAN_RANK[requiredPlan])
      setLoading(false)
    }
    check()
  }, [requiredPlan])

  return { hasAccess, userPlan, loading }
}
