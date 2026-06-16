const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // 1. Identify user if logged in — anonymous donations are allowed
    let userId = "anonymous";
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const djangoRes = await fetch(
        "https://story-spinner-api.onrender.com/api/auth/me/",
        { headers: { Authorization: authHeader } }
      );
      if (djangoRes.ok) {
        const userData = await djangoRes.json();
        userId = String(userData.id ?? userData.email ?? "anonymous");
      }
    }

    // 3. Parse + validate body
    const body = await req.json();
    const amount = body.amount;
    if (!Number.isInteger(amount) || amount <= 0 || amount > 1_000_000) {
      return json({ error: "amount must be an integer between 1 and 1000000 (cents)" }, 400);
    }

    // 4. Create Stripe PaymentIntent — key from env, never hardcoded
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-06-20",
    });
    const intent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      metadata: { user_id: userId },
    });

    return json({ client_secret: intent.client_secret });
  } catch (_err) {
    return json({ error: "Internal server error" }, 500);
  }
});
