const BASE_URL = process.env.BASE_URL || "https://fuwari.mataspss.workers.dev";

const [email, password, userName] = process.argv.slice(2);

if (!email || !password || !userName) {
  console.error("Usage: npx tsx scripts/create-user.ts <email> <password> <name>");
  console.error("  BASE_URL env var to change server (default: http://localhost:4321)");
  process.exit(1);
}

const res = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password, name: userName }),
});

const data = await res.json();

if (!res.ok) {
  console.error("Sign-up failed:", data);
  process.exit(1);
}

console.log("User created:", data.user.id, data.user.email);
export {};
