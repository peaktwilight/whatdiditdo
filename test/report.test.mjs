import test from "node:test";
import assert from "node:assert/strict";

import { parseDiff, detectNewDeps, scanSecurity } from "../dist/git.js";
import { generatePRDescription } from "../dist/pr.js";

const sampleDiff = `diff --git a/package.json b/package.json
index 1111111..2222222 100644
--- a/package.json
+++ b/package.json
@@ -1,4 +1,5 @@
 {
+  "chalk": "^5.0.0",
   "name": "demo"
 }
diff --git a/src/index.ts b/src/index.ts
index 3333333..4444444 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -0,0 +1,3 @@
+const token = "sk_test_1234567890abcdef";
+console.log(token);
+export {};
`;

test("report helpers detect dependencies, security flags, and PR copy", () => {
  const files = parseDiff(sampleDiff);
  const deps = detectNewDeps(files);
  const securityFlags = scanSecurity(files);
  const pr = generatePRDescription(files, deps, securityFlags, null);

  assert.equal(files.length, 2);
  assert.deepEqual(deps, ["chalk"]);
  assert.equal(securityFlags.length, 1);
  assert.match(pr.title, /Update 2 files/);
  assert.match(pr.body, /New Dependencies/);
  assert.match(pr.body, /Security Notes/);
});
