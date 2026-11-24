# You In · Brandbook

## Idea
**You In** es la respuesta a «¿te vienes?». Somos la agenda seleccionada de música electrónica en Valencia:
pocas fiestas, bien elegidas, y una forma sencilla de decir «yo voy» y de llevar a alguien contigo.

- **Promesa:** tu próxima noche, seleccionada.
- **Gesto de marca:** la invitación. Todo en la interfaz lleva a guardar un plan o a preguntarle a alguien «¿te vienes?».
- **Para quién:** quien viene por primera vez, quien ya conoce la escena y quien trae gente. Los tres caben.

## Personalidad
Cuidada como una marca de diseño, cercana como un amigo que te pasa el plan.
**Seria en lo práctico** (fechas, precios, entradas, ventas) y **cercana en los detalles** (pegatinas, puntos de color, el «?» de «¿te vienes?»).

| Somos | No somos |
|---|---|
| Seleccionados, claros, seguros, con ganas de que vengas | Ruidosos, saturados, de flyer |
| Cálidos, con humor ligero | Infantiles o con chistes forzados |
| Música primero | Precio primero |

## Voz
- Tuteo, frases cortas, verbos al principio: «Guarda el plan», «Invita a alguien», «Compra tu entrada».
- Una sola frase con chispa por pantalla, como mucho. Signos de exclamación con moderación.
- Datos exactos y sin adornos: fecha, hora, sala, precio, edad.
- Nunca prometemos acceso: «Solicitud recibida» no es «estás dentro».
- El enlace de promotor se nombra siempre como tal: «tu enlace personal de venta». Invitar a un amigo es otra cosa.

## Logotipo
Palabra «YOU IN» en Outfit 600, en mayúsculas espaciadas, seguida de un punto ácido (●). Sobre papel, en tinta.
El nombre se cambia en `src/config/site.ts`; el punto acompaña siempre al nombre.

## Color
| Token | Hex | Uso | Proporción |
|---|---|---|---|
| `--paper` | `#F6F3EE` | Fondo general | 60 % |
| `--card` | `#FFFFFF` | Tarjetas y formularios | 25 % |
| `--ink` | `#141414` | Texto, botón principal, cabecera | 10 % |
| `--acid` | `#C6F432` | Acento: invitar, punto del logo, estados positivos | 3 % |
| `--lilac` | `#CDBFFF` | Pegatina «Recomendada», «Por qué ir», programa de promotores | 1 % |
| `--coral` | `#FF6A45` | «Comprar entrada», avisos importantes | 1 % |
| `--muted` | `#6E6862` | Texto secundario | — |
| `--line` | `#E4DED4` | Bordes finos | — |

El ácido y el coral nunca van juntos en el mismo botón. Texto siempre en tinta sobre ácido, lila y coral.

## Tipografía
Solo dos familias, simples y cercanas, porque somos una comunidad que une:

- **Outfit** (títulos): redonda, clara y amable. Nombres de fiesta, salas y logotipo en **MAYÚSCULAS** con espaciado (+5 a +8 %), peso 600. Frases destacadas («Gratis hasta las 21:30») en minúsculas, peso 500.
- **DM Sans** (texto): suave y muy legible en el móvil. Párrafos, botones, etiquetas y datos. Pesos 400 / 500 / 600.

Sin cursivas decorativas ni terceras fuentes. Ambas se sirven desde `public/fonts` (licencia OFL, subconjunto latino).

## Componentes
- **Botones en píldora.** Principal: tinta con texto blanco. Invitar: ácido. Comprar: coral. Secundario: blanco con borde de tinta.
- **Tarjeta de fiesta.** Cartel cuadrado con esquinas de 18 px, fecha en bloque («07 DIC»), pegatina de la lista y «con …» para los artistas.
- **Pegatinas.** Etiquetas ligeramente giradas (−2°): «Lista: gratis hasta…», «En tus planes», «Recomendada». Máximo una por tarjeta.
- **Entrada (ticket).** «Tu plan» lleva un borde perforado superior: es lo que te llevas.
- **Sin cartel.** Bloque lila con el nombre de la fiesta en mayúsculas, nunca un hueco vacío.
- **Lista por impulso.** La ventaja de la lista en grande, cuenta atrás en directo, «N personas ya se han apuntado» con puntos de color, un solo formulario y un pase «Estás dentro» con confeti al terminar.
- **Invitar.** Mensajes rápidos para elegir con un toque y contador de invitaciones enviadas.
- **Sin nombres propios del equipo.** La marca habla en nombre de You In, nunca de una persona.

## Lo que no hacemos
- Degradados arcoíris, neones o fondos oscuros saturados.
- Más de un color de acento en una misma acción.
- Inventar fechas, precios, artistas o cupos: si no está confirmado, va en borrador.
