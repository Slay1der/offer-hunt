import test from "node:test";
import assert from "node:assert/strict";
import { toRole, regionFor, visaFor, isEarlyCareer, trackFor } from "../lib/match.js";

test("keeps early-career SWE in Europe", () => {
  const r = toRole({ company: "Acme", title: "Junior Backend Engineer", link: "https://x.io/1", location: "Berlin, Germany", text: "We offer relocation support and visa sponsorship is available.", source: "t" });
  assert.equal(r.track, "Software engineering");
  assert.equal(r.region, "Europe");
  assert.equal(r.visa, "yes");
});

test("drops senior roles", () => {
  assert.equal(toRole({ company: "A", title: "Senior Software Engineer", link: "https://x.io/2", location: "London", source: "t" }), null);
});

test("devops grad role in London", () => {
  const r = toRole({ company: "Bank", title: "Graduate Site Reliability Engineer", link: "https://x.io/3", location: "London, UK", text: "", source: "t" });
  assert.equal(r.track, "DevOps / Cloud / SRE");
  assert.equal(r.region, "UK");
  assert.equal(r.type, "Graduate / new grad");
});

test("US role without sponsorship is dropped", () => {
  assert.equal(toRole({ company: "A", title: "New Grad Software Engineer", link: "https://x.io/4", location: "New York, NY", text: "Must have the right to work in the US", source: "t" }), null);
});

test("helpers", () => {
  assert.equal(regionFor("Remote - Worldwide", true), "Remote");
  assert.equal(visaFor("We are unable to sponsor visas"), "no");
  assert.equal(isEarlyCareer("Software Engineer", "Ideal for new grads"), true);
  assert.equal(trackFor("Product Designer"), null);
});
