import { createClient } from "@supabase/supabase-js";
import { setDefaultResultOrder, setServers, lookup as dnsLookup } from "node:dns";

// Workaround p/ DNS local lento/IPv6-first no Windows — força IPv4, DNS público
// e faz um pre-warm do cache de DNS para evitar Connect Timeout (UND_ERR_CONNECT_TIMEOUT)
// na primeira chamada pro Supabase.
try {
  setDefaultResultOrder("ipv4first");
  setServers(["1.1.1.1", "8.8.8.8"]);
} catch {
  // runtime sem suporte — segue em frente
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

try {
  const host = new URL(supabaseUrl).hostname;
  dnsLookup(host, { family: 4 }, () => {});
} catch {
  /* ignora */
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
