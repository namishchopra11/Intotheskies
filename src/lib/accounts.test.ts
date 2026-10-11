import { beforeEach, describe, expect, it } from "vitest";
import { accountKey, useTripStore } from "@/lib/store";
import type { Profile } from "@/lib/types";

const state = () => useTripStore.getState();
const alex: Profile = { name: "Alex", email: "Alex@Example.com", guest: false, provider: "email" };
const sam: Profile = { name: "Sam", email: "sam@example.com", guest: false, provider: "google" };
const guest: Profile = { name: "", email: "", guest: true };

describe("each account keeps its own trips", () => {
  beforeEach(() => {
    state().signOut({ erase: true });
    useTripStore.setState({ accounts: {} });
  });

  it("a guest after a log-out starts with no trip, not the last person's", () => {
    state().signIn(guest);
    state().loadSampleTrip();
    state().signOut();
    state().signIn(guest);
    expect(state().trip).toBeNull();
  });

  it("an account gets its trips back when it signs in again", () => {
    state().signIn(alex);
    state().loadSampleTrip();
    state().saveAndCloseTrip();
    state().loadSampleTrip();
    state().signOut();
    expect(state().trip).toBeNull();

    state().signIn(guest);
    expect(state().trip).toBeNull();
    state().signOut();

    state().signIn({ ...alex, email: "alex@example.com" }); // same account, any case
    expect(state().trip?.name).toBe("Rome via London");
    expect(state().savedTrips).toHaveLength(1);
  });

  it("keeps different accounts apart", () => {
    state().signIn(alex);
    state().loadSampleTrip();
    state().signOut();
    state().signIn(sam);
    expect(state().trip).toBeNull();
  });

  it("a guest who creates an account keeps the open trip", () => {
    state().signIn(guest);
    state().loadSampleTrip();
    state().signIn(sam);
    expect(state().trip?.name).toBe("Rome via London");
  });

  it("deleting an account drops its put-away trips", () => {
    state().signIn(alex);
    state().loadSampleTrip();
    state().signOut({ erase: true });
    state().signIn(alex);
    expect(state().trip).toBeNull();
  });

  it("only signed-in accounts have a key", () => {
    expect(accountKey(guest)).toBeNull();
    expect(accountKey(alex)).toBe("email:alex@example.com");
  });
});
