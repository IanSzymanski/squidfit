import { describe, it, expect } from "vitest";
import { evictDurableObject } from "cloudflare:test";
import { connect, freshAccount } from "./helpers.js";

describe("Account sync store", () => {
  it("HOST-2: a first snapshot carries every doc, and an empty collection says so", async () => {
    const acc = freshAccount();
    const a = await connect(acc);
    const [empty] = await a.sub("days");
    expect(empty).toMatchObject({ t: "snap", coll: "days", first: true, last: true, docs: [] });
    await a.call("set", { path: "foods/f1", body: { id: "f1", name: "Oats" } });
    await a.call("set", { path: "foods/f2", body: { id: "f2", name: "Rice" } });
    const [snap] = await a.sub("foods");
    expect(snap.docs).toEqual([["f1", { id: "f1", name: "Oats" }], ["f2", { id: "f2", name: "Rice" }]]);
  });

  it("HOST-3/5: set acks after commit and echoes to every subscriber, the writer included", async () => {
    const acc = freshAccount();
    const a = await connect(acc), b = await connect(acc);
    await a.sub("days");
    await b.sub("days");
    const ack = await a.call("set", { path: "days/2026-10-31", body: { d: "2026-10-31", wKg: 80 } });
    expect(ack).toMatchObject({ ok: true });
    for (const c of [a, b]) expect(await c.next(m => m.t === "chg")).toEqual({ t: "chg", coll: "days", id: "2026-10-31", body: { d: "2026-10-31", wKg: 80 } });
    expect((await b.call("get", { path: "days/2026-10-31" })).body).toEqual({ d: "2026-10-31", wKg: 80 });
  });

  it("HOST-6: a delete reaches subscribers as a null body and get then finds nothing", async () => {
    const acc = freshAccount();
    const a = await connect(acc);
    await a.call("set", { path: "rides/r1", body: { id: "r1" } });
    await a.sub("rides");
    await a.call("del", { path: "rides/r1" });
    expect(await a.next(m => m.t === "chg")).toEqual({ t: "chg", coll: "rides", id: "r1", body: null });
    expect((await a.call("get", { path: "rides/r1" })).body).toBeNull();
  });

  it("only sends changes to sockets subscribed to that collection", async () => {
    const acc = freshAccount();
    const a = await connect(acc), b = await connect(acc);
    await a.sub("days");
    await b.sub("foods");
    await a.call("set", { path: "days/2026-01-01", body: { d: "2026-01-01" } });
    expect(await b.none(m => m.t === "chg")).toBe(true);
  });

  it("HOST-7: refuses a document over 256 KiB and stores nothing", async () => {
    const acc = freshAccount();
    const a = await connect(acc);
    const ack = await a.call("set", { path: "pix/big", body: { id: "big", img: "x".repeat(256 * 1024) } });
    expect(ack).toMatchObject({ ok: false, code: "invalid_argument" });
    expect((await a.call("get", { path: "pix/big" })).body).toBeNull();
  });

  it("rejects malformed paths and bodies", async () => {
    const a = await connect(freshAccount());
    for (const extra of [{ path: "nocoll", body: {} }, { path: "a b/x", body: {} }, { path: "days/x", body: [1] }, { path: "days/x", body: "s" }])
      expect(await a.call("set", extra)).toMatchObject({ ok: false, code: "invalid_argument" });
  });

  it("splits a large snapshot into ordered frames", async () => {
    const acc = freshAccount();
    const a = await connect(acc);
    for (let i = 0; i < 6; i++) await a.call("set", { path: `pix/p${i}`, body: { id: `p${i}`, img: "y".repeat(200 * 1024) } });
    const frames = await a.sub("pix");
    expect(frames.length).toBeGreaterThan(1);
    expect(frames.map(f => [f.first, f.last])).toEqual(frames.map((_, i) => [i === 0, i === frames.length - 1]));
    expect(frames.flatMap(f => f.docs.map(d => d[0]))).toEqual(["p0", "p1", "p2", "p3", "p4", "p5"]);
  });

  it("delivers a single document on subscribe and after each change", async () => {
    const acc = freshAccount();
    const a = await connect(acc);
    a.send({ op: "subdoc", path: "settings/main" });
    expect(await a.next(m => m.t === "doc")).toEqual({ t: "doc", path: "settings/main", body: null });
    await a.call("set", { path: "settings/main", body: { units: { w: "lb" } } });
    expect(await a.next(m => m.t === "doc")).toEqual({ t: "doc", path: "settings/main", body: { units: { w: "lb" } } });
  });

  it("answers ping without waking the object and keeps data and sockets across eviction", async () => {
    const acc = freshAccount();
    const a = await connect(acc);
    await a.sub("days");
    await a.call("set", { path: "days/2026-02-02", body: { d: "2026-02-02" } });
    await a.next(m => m.t === "chg");
    await evictDurableObject(acc);
    a.send("ping");
    expect(await a.next(m => m.t === "pong")).toEqual({ t: "pong" });
    await a.call("set", { path: "days/2026-02-03", body: { d: "2026-02-03" } });
    expect(await a.next(m => m.t === "chg")).toMatchObject({ id: "2026-02-03" });
    const b = await connect(acc);
    const [snap] = await b.sub("days");
    expect(snap.docs.map(d => d[0])).toEqual(["2026-02-02", "2026-02-03"]);
  });

  it("caps AI calls per UTC day", async () => {
    const acc = freshAccount();
    expect([await acc.aiTick(2), await acc.aiTick(2), await acc.aiTick(2)]).toEqual([true, true, false]);
  });
});
