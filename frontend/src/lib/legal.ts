// Single source of truth for the legal/RGPD pages. The titular is the
// official sponsor of this tournament platform (Asador La Morenica), so
// the text below is the company's own legal copy. Keep parity with the
// asador-side source: client/admin/src/components/layout/footer-legal.ts.
//
// To update text: change here, rebuild. Astro pages consume the named
// keys and render under a common layout.

export type LegalKey = "aviso-legal" | "privacidad" | "cookies";

export const legalContent: Record<LegalKey, { title: string; content: string }> = {
  "aviso-legal": {
    title: "Aviso Legal",
    content: `AVISO LEGAL

1. DATOS IDENTIFICATIVOS
En cumplimiento con el deber de información recogido en artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y del Comercio Electrónico, a continuación se reflejan los siguientes datos:

Titular: Asador La Morenica
Domicilio: C/ Celada 72, Villena (03400) Alicante
Teléfono: 965813907 / 686536975
Email: asadorlamorenica@gmail.com

2. OBJETO
El presente aviso legal regula el uso y utilización del sitio web, del que es titular Asador La Morenica.

3. PROPIEDAD INTELECTUAL E INDUSTRIAL
El sitio web, incluyendo a título enunciativo pero no limitativo su programación, edición, compilación y demás elementos necesarios para su funcionamiento, los diseños, logotipos, texto y/o gráficos son propiedad del prestador o en su caso dispone de licencia o autorización expresa por parte de los autores.

4. CONDICIONES DE ACCESO Y UTILIZACIÓN
El sitio web y sus servicios son de acceso libre y gratuito, no obstante, el prestador condiciona la utilización de algunos de los servicios ofrecidos en su web a la previa cumplimentación del correspondiente formulario.

5. EXCLUSIÓN DE GARANTÍAS Y RESPONSABILIDAD
El prestador se exime de cualquier tipo de responsabilidad derivada de la información publicada en su sitio web, siempre que esta información haya sido manipulada o introducida por un tercero ajeno al mismo.

6. LEY APLICABLE Y JURISDICCIÓN
Para la resolución de todas las controversias o cuestiones relacionadas con el presente sitio web o de las actividades en él desarrolladas, será de aplicación la legislación española.`,
  },
  privacidad: {
    title: "Política de Privacidad",
    content: `POLÍTICA DE PRIVACIDAD

1. RESPONSABLE DEL TRATAMIENTO
Identidad: Asador La Morenica
Dirección: C/ Celada 72, Villena (03400) Alicante
Teléfono: 965813907 / 686536975
Correo electrónico: asadorlamorenica@gmail.com

2. FINALIDAD DEL TRATAMIENTO
En Asador La Morenica tratamos la información que nos facilitan las personas interesadas con el fin de:
- Gestionar pedidos y reservas
- Enviar comunicaciones comerciales (si se ha dado consentimiento)
- Gestionar el programa de fidelización y puntos
- Atender consultas y solicitudes

3. LEGITIMACIÓN
El tratamiento de sus datos se realiza con las siguientes bases jurídicas:
- Ejecución de un contrato o medidas precontractuales
- Consentimiento del interesado
- Interés legítimo del responsable

4. CONSERVACIÓN DE DATOS
Los datos personales proporcionados se conservarán mientras se mantenga la relación comercial o durante los años necesarios para cumplir con las obligaciones legales.

5. COMUNICACIÓN DE DATOS
Los datos no se comunicarán a terceros salvo obligación legal.

6. DERECHOS DEL INTERESADO
Cualquier persona tiene derecho a obtener confirmación sobre si estamos tratando datos personales que les conciernan, o no. Las personas interesadas tienen derecho a acceder a sus datos personales, así como a solicitar la rectificación de los datos inexactos o, en su caso, solicitar su supresión cuando, entre otros motivos, los datos ya no sean necesarios para los fines que fueron recogidos.

En determinadas circunstancias, los interesados podrán solicitar la limitación del tratamiento de sus datos, en cuyo caso únicamente los conservaremos para el ejercicio o la defensa de reclamaciones.

Para ejercer estos derechos puede contactar con nosotros en: asadorlamorenica@gmail.com`,
  },
  cookies: {
    title: "Política de Cookies",
    content: `POLÍTICA DE COOKIES

1. ¿QUÉ SON LAS COOKIES?
Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita nuestro sitio web. Estas cookies nos ayudan a hacer que el sitio web funcione correctamente, a hacerlo más seguro, a proporcionar una mejor experiencia de usuario y a entender cómo funciona el sitio web.

2. ¿QUÉ TIPOS DE COOKIES UTILIZAMOS?
Nuestro sitio web utiliza los siguientes tipos de cookies:

Cookies Técnicas o Necesarias:
Son aquellas que permiten al usuario la navegación a través de una página web, plataforma o aplicación y la utilización de las diferentes opciones o servicios que en ella existan.

Cookies de Sesión:
Estas cookies son necesarias para mantener su sesión activa mientras navega por nuestro sitio. Se eliminan cuando cierra el navegador.

Cookies de Preferencias:
Estas cookies nos permiten recordar información que cambia la forma en que el sitio web se comporta o se ve, como su idioma preferido o la región en la que se encuentra.

3. GESTIÓN DE COOKIES
Puede configurar su navegador para rechazar cookies o para que le avise cuando se envía una cookie. Sin embargo, si rechaza las cookies, es posible que algunas partes de nuestro sitio web no funcionen correctamente.

4. CÓMO DESACTIVAR LAS COOKIES
Puede permitir, bloquear o eliminar las cookies instaladas en su equipo mediante la configuración de las opciones del navegador instalado en su ordenador.

5. ACTUALIZACIÓN DE LA POLÍTICA DE COOKIES
Esta política de cookies puede ser modificada en función de exigencias legislativas, reglamentarias, o con la finalidad de adaptar dicha política a las instrucciones dictadas por la Agencia Española de Protección de Datos.

Para cualquier duda o consulta acerca de esta política de cookies, puede contactar con nosotros en: asadorlamorenica@gmail.com`,
  },
};
