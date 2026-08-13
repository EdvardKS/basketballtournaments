const BRAND = process.env.BRAND_NAME ?? "Basket Edvardks";

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#fff;border-radius:12px;padding:28px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
    <h1 style="margin:0 0 16px;font-size:20px;color:#ea580c">${BRAND}</h1>
    <h2 style="margin:0 0 12px;font-size:16px">${title}</h2>
    ${bodyHtml}
  </div>
  <p style="text-align:center;color:#a1a1aa;font-size:12px;margin-top:16px">${BRAND}</p>
</div></body></html>`;
}

export function welcomeEmail(name: string | null | undefined) {
  const greeting = name ? `Hola ${name},` : "Hola,";
  return {
    subject: `Bienvenido/a a ${BRAND}`,
    text: `${greeting}\n\nTu cuenta en ${BRAND} se ha creado correctamente. Ya puedes participar en los torneos.\n\nUn saludo.`,
    html: layout("Cuenta creada", `<p>${greeting}</p><p>Tu cuenta en <strong>${BRAND}</strong> se ha creado correctamente. Ya puedes participar en los torneos.</p><p>Un saludo.</p>`),
  };
}

export function passwordResetEmail(name: string | null | undefined, resetUrl: string) {
  const greeting = name ? `Hola ${name},` : "Hola,";
  return {
    subject: `Recupera tu contraseña — ${BRAND}`,
    text: `${greeting}\n\nHas solicitado restablecer tu contraseña. Abre este enlace (caduca en 1 hora):\n\n${resetUrl}\n\nSi no fuiste tú, ignora este correo.`,
    html: layout(
      "Recuperar contraseña",
      `<p>${greeting}</p><p>Has solicitado restablecer tu contraseña. Pulsa el botón (caduca en 1 hora):</p>
       <p><a href="${resetUrl}" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px">Restablecer contraseña</a></p>
       <p style="font-size:12px;color:#888">O copia este enlace: ${resetUrl}</p>
       <p style="font-size:12px;color:#888">Si no fuiste tú, ignora este correo.</p>`,
    ),
  };
}

export function passwordChangedEmail(name: string | null | undefined) {
  const greeting = name ? `Hola ${name},` : "Hola,";
  return {
    subject: `Tu contraseña ha cambiado — ${BRAND}`,
    text: `${greeting}\n\nTu contraseña se ha cambiado correctamente. Si no fuiste tú, contáctanos de inmediato.`,
    html: layout("Contraseña actualizada", `<p>${greeting}</p><p>Tu contraseña se ha cambiado correctamente.</p><p style="font-size:12px;color:#888">Si no fuiste tú, contáctanos de inmediato.</p>`),
  };
}
