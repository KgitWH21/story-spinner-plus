const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const errRes = (msg: string, status: number) =>
    new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  // 1. Verify Stripe signature — MUST read raw body text before any JSON parse
  const signature = req.headers.get("stripe-signature");
  if (!signature) return errRes("Missing stripe-signature", 400);

  const rawBody = await req.text();

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-06-20",
  });

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (_err) {
    return errRes("Signature verification failed", 400);
  }

  // 2. Handle payment events
  const handled = ["payment_intent.succeeded", "payment_intent.payment_failed"];
  if (!handled.includes(event.type)) {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const intent = event.data.object as {
    id: string;
    amount: number;
    metadata?: { user_id?: string };
  };
  const status = event.type === "payment_intent.succeeded" ? "succeeded" : "failed";

  // 3. Supabase service-role client (bypasses RLS)
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 4. Idempotency check — skip if already recorded
  const { data: existing } = await supabase
    .from("donations")
    .select("id")
    .eq("stripe_payment_intent_id", intent.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from("donations").insert({
      user_id: intent.metadata?.user_id ?? "unknown",
      amount: intent.amount,
      stripe_payment_intent_id: intent.id,
      status,
    });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
