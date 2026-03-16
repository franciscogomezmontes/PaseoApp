const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const {
      email,
      nombre_invitado,
      nombre_paseo,
      codigo_invitacion,
      nombre_organizador,
    } = await req.json();

    if (!email || !codigo_invitacion) {
      return new Response(JSON.stringify({ error: "Faltan datos" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PaseoApp <onboarding@resend.dev>",
        to: [email],
        subject: `${nombre_organizador} te invitó a ${nombre_paseo} 🏕️`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h1 style="font-size: 28px; color: #1B4F72; margin-bottom: 8px;">¡Hola, ${nombre_invitado}!</h1>
            <p style="font-size: 16px; color: #475569; line-height: 24px;">
              <strong>${nombre_organizador}</strong> te invitó a unirte al paseo
              <strong>${nombre_paseo}</strong> en PaseoApp.
            </p>
            <div style="background: #EFF6FF; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
              <p style="font-size: 12px; color: #64748b; margin: 0 0 8px; font-weight: 600; letter-spacing: 1px;">CÓDIGO DE INVITACIÓN</p>
              <p style="font-size: 36px; font-weight: 800; color: #1B4F72; letter-spacing: 6px; margin: 0;">${codigo_invitacion}</p>
            </div>
            <p style="font-size: 14px; color: #64748b; line-height: 22px;">
              Descarga PaseoApp, crea tu cuenta y usa este código para unirte al paseo.
            </p>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 32px;">
              Hecho con ❤️ en Colombia · PaseoApp
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});