import { describe, expect, it } from "vitest";
import { rewardMessage, computeRewards } from "./rewards";
import { checkXceedUrl } from "./xceed";
import { eventRange, madridToUtcIso, madridParts, hasEnded } from "./time";
import { safeNext } from "./nav";

const msg = (confirmed: number, delivered = 0, cap: number | null = null) =>
  rewardMessage({ confirmed, threshold: 5, cap, delivered });

describe("mensajes de recompensa (regla Elenco: 5 → 1)", () => {
  it("0 ventas", () => expect(msg(0)).toBe("Comparte tu enlace. Con 5 entradas confirmadas consigues tu invitación"));
  it("3 ventas", () => expect(msg(3)).toBe("Llevas 3 de 5. Te faltan 2 entradas para tu invitación"));
  it("4 ventas (singular)", () => expect(msg(4)).toBe("Llevas 4 de 5. Te falta 1 entrada para tu invitación"));
  it("5 ventas", () => expect(msg(5)).toBe("Has conseguido 1 invitación. Pendiente de entrega"));
  it("7 ventas sin límite", () => expect(msg(7)).toBe("Tienes 1 invitación conseguida. Te faltan 3 entradas para la siguiente"));
  it("5 ventas entregada", () => expect(msg(5, 1)).toBe("Has conseguido 1 invitación. Entregada"));
  it("10 ventas, 1 entregada", () => expect(msg(10, 1)).toBe("Has conseguido 2 invitaciones. 1 entregada, 1 pendiente de entrega"));
  it("límite 1 con 12 ventas", () =>
    expect(msg(12, 0, 1)).toBe("Has conseguido 1 invitación. Pendiente de entrega. Has alcanzado el máximo para esta fiesta"));
  it("reembolso tras entregar marca revisión", () => {
    const s = computeRewards({ confirmed: 4, threshold: 5, cap: null, delivered: 1 });
    expect(s).toMatchObject({ earned: 0, pending: 0, needsReview: true });
  });
});

describe("enlaces de Xceed", () => {
  it("acepta https de xceed.me", () => {
    expect(checkXceedUrl(" https://XCEED.me/es/valencia/event/x/1?ref=a#top ")).toEqual({
      ok: true,
      url: "https://xceed.me/es/valencia/event/x/1?ref=a",
    });
    expect(checkXceedUrl("https://www.xceed.me/x").ok).toBe(true);
  });
  for (const bad of [
    "http://xceed.me/x",
    "https://xceed.me.evil.com/x",
    "https://evil.com/xceed.me",
    "https://user@xceed.me/x",
    "https://xceed.me:8443/x",
    "javascript:alert(1)",
    "",
  ]) {
    it(`rechaza ${bad || "(vacío)"}`, () => expect(checkXceedUrl(bad).ok).toBe(false));
  }
});

describe("zona horaria Europe/Madrid", () => {
  it("invierno (UTC+1)", () => expect(madridToUtcIso("2026-12-12", "23:30")).toBe("2026-12-12T22:30:00.000Z"));
  it("verano (UTC+2)", () => expect(madridToUtcIso("2026-07-04", "23:30")).toBe("2026-07-04T21:30:00.000Z"));
  it("fin al día siguiente", () =>
    expect(eventRange("2026-12-12", "23:30", "06:00")).toEqual({
      starts_at: "2026-12-12T22:30:00.000Z",
      ends_at: "2026-12-13T05:00:00.000Z",
    }));
  it("ida y vuelta", () => expect(madridParts("2026-12-12T22:30:00.000Z")).toEqual({ date: "2026-12-12", time: "23:30" }));
  it("terminado", () => {
    expect(hasEnded({ starts_at: "2020-01-01T00:00:00Z", ends_at: null })).toBe(true);
    expect(hasEnded({ starts_at: null, ends_at: null })).toBe(false);
  });
});

describe("redirección segura tras registro", () => {
  it("acepta rutas internas", () => expect(safeNext("/eventos/elenco")).toBe("/eventos/elenco"));
  it("rechaza externas", () => {
    expect(safeNext("https://evil.com")).toBe("/perfil");
    expect(safeNext("//evil.com")).toBe("/perfil");
    expect(safeNext("/\\evil.com")).toBe("/perfil");
  });
});
