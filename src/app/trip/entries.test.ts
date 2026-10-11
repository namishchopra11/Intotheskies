import { describe, expect, it } from "vitest";
import { PERSON, validate } from "./entries";

describe("PERSON entry", () => {
  const draft = { name: "Marco", role: "pickup", phone: "", email: "" };

  it("needs only a name and a role; phone and email are optional", () => {
    expect(validate(PERSON, draft)).toEqual({});
    expect(validate(PERSON, { ...draft, name: "  " })).toEqual({ name: "Required." });
  });

  it("rejects an email that is clearly a typo, and accepts a plain one", () => {
    expect(validate(PERSON, { ...draft, email: "marco@example" }).email).toMatch(/email/i);
    expect(validate(PERSON, { ...draft, email: "marco example.com" }).email).toMatch(/email/i);
    expect(validate(PERSON, { ...draft, email: " marco@example.com " })).toEqual({});
  });

  it("builds a Person with trimmed text, leaving blank phone and email unset", () => {
    const p = PERSON.fromDraft({ name: " Marco ", role: "pickup", phone: "  ", email: " m@x.io " }, "p1");
    expect(p).toEqual({ id: "p1", name: "Marco", role: "pickup", phone: undefined, email: "m@x.io" });
  });

  it("falls back to 'other' rather than saving a role the app doesn't know", () => {
    expect(PERSON.fromDraft({ ...draft, role: "banana" }, "p1").role).toBe("other");
  });

  it("round-trips through the form, and a new person starts as family", () => {
    const person = { id: "p2", name: "Mum", role: "family" as const, phone: "+44 7700 900123", email: "mum@example.com" };
    expect(PERSON.fromDraft(PERSON.toDraft(person), person.id, person)).toEqual(person);
    expect(PERSON.toDraft().role).toBe("family");
  });

  it("lists a person by name, with their role and a way to reach them", () => {
    const p = { id: "p3", name: "Marco", role: "pickup" as const, email: "m@x.io" };
    expect(PERSON.title(p)).toBe("Marco");
    expect(PERSON.subtitle(p)).toBe("Picking me up · m@x.io");
    expect(PERSON.subtitle({ ...p, phone: "+39 06 0000 0199" })).toBe("Picking me up · +39 06 0000 0199");
    expect(PERSON.subtitle({ id: "p4", name: "Sam", role: "other" })).toBe("Someone else");
  });
});
