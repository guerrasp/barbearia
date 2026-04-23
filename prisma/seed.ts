import "dotenv/config";
import { setDefaultResultOrder, setServers } from "node:dns";
// DNS local do Windows às vezes tem timeout em *.supabase.co — força DNS público e IPv4.
setServers(["8.8.8.8", "1.1.1.1"]);
setDefaultResultOrder("ipv4first");
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Edite aqui se quiser outras credenciais de admin.
const ADMIN_EMAIL = "admin@barbearia.com";
const ADMIN_PASSWORD = "Admin123!";

async function upsertAuthUser(email: string, password: string) {
  // Tenta criar; se já existir, busca o ID.
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.data.user) return created.data.user.id;

  const list = await supabase.auth.admin.listUsers();
  const found = list.data.users.find((u) => u.email === email);
  if (!found) throw new Error(`Não foi possível criar/encontrar usuário ${email}: ${created.error?.message}`);
  return found.id;
}

async function main() {
  console.log("→ Criando Store...");
  const store = await prisma.store.upsert({
    where: { slug: "barbearia-demo" },
    update: {},
    create: {
      name: "Barbearia Demo",
      slug: "barbearia-demo",
      phone: "(27) 99999-0000",
      email: "contato@barbearia-demo.com",
      address: "Rua Exemplo, 100 - Vitória/ES",
    },
  });

  console.log("→ Criando usuário admin no Supabase Auth...");
  const adminSupabaseId = await upsertAuthUser(ADMIN_EMAIL, ADMIN_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { supabaseId: adminSupabaseId },
    update: { name: "Administrador", role: "ADMIN", storeId: store.id },
    create: {
      supabaseId: adminSupabaseId,
      email: ADMIN_EMAIL,
      name: "Administrador",
      role: "ADMIN",
      storeId: store.id,
    },
  });

  console.log("→ Criando categorias...");
  const catCabelo = await prisma.category.upsert({
    where: { name_storeId: { name: "Cabelo", storeId: store.id } },
    update: {},
    create: { name: "Cabelo", storeId: store.id },
  });
  const catBarba = await prisma.category.upsert({
    where: { name_storeId: { name: "Barba", storeId: store.id } },
    update: {},
    create: { name: "Barba", storeId: store.id },
  });
  const catCombo = await prisma.category.upsert({
    where: { name_storeId: { name: "Combos", storeId: store.id } },
    update: {},
    create: { name: "Combos", storeId: store.id },
  });

  console.log("→ Criando serviços...");
  const services = [
    { name: "Corte Masculino", price: 45, durationMinutes: 30, categoryId: catCabelo.id },
    { name: "Corte Degradê", price: 55, durationMinutes: 40, categoryId: catCabelo.id },
    { name: "Corte Infantil", price: 35, durationMinutes: 30, categoryId: catCabelo.id },
    { name: "Barba", price: 30, durationMinutes: 25, categoryId: catBarba.id },
    { name: "Barba + Pezinho", price: 40, durationMinutes: 35, categoryId: catBarba.id },
    { name: "Corte + Barba", price: 70, durationMinutes: 55, categoryId: catCombo.id },
    { name: "Sobrancelha", price: 15, durationMinutes: 10, categoryId: catBarba.id },
  ];
  for (const s of services) {
    const existing = await prisma.service.findFirst({
      where: { name: s.name, storeId: store.id },
    });
    if (!existing) {
      await prisma.service.create({ data: { ...s, storeId: store.id } });
    }
  }

  console.log("→ Criando barbeiros...");
  const barber1 = await prisma.barber.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      name: "João Silva",
      bio: "Barbeiro há 10 anos, especialista em degradês.",
      specialties: "Degradê, Navalhado, Barba",
      commissionRate: 40,
      storeId: store.id,
      userId: admin.id,
    },
  });

  const existingBarber2 = await prisma.barber.findFirst({
    where: { storeId: store.id, name: "Pedro Santos" },
  });
  const barber2 = existingBarber2 ?? await prisma.barber.create({
    data: {
      name: "Pedro Santos",
      bio: "Barbeiro clássico, atendimento familiar.",
      specialties: "Corte clássico, Barba, Infantil",
      commissionRate: 35,
      storeId: store.id,
    },
  });

  console.log("→ Criando horários de trabalho...");
  // Seg-Sex: 09-12 e 13-18. Sáb: 09-14. Domingo: fechado.
  const weekTemplate = [
    { weekday: 1, blocks: [["09:00", "12:00"], ["13:00", "18:00"]] },
    { weekday: 2, blocks: [["09:00", "12:00"], ["13:00", "18:00"]] },
    { weekday: 3, blocks: [["09:00", "12:00"], ["13:00", "18:00"]] },
    { weekday: 4, blocks: [["09:00", "12:00"], ["13:00", "18:00"]] },
    { weekday: 5, blocks: [["09:00", "12:00"], ["13:00", "19:00"]] },
    { weekday: 6, blocks: [["09:00", "14:00"]] },
  ];

  for (const barber of [barber1, barber2]) {
    await prisma.workingHours.deleteMany({ where: { barberId: barber.id } });
    for (const day of weekTemplate) {
      for (const [startTime, endTime] of day.blocks) {
        await prisma.workingHours.create({
          data: { barberId: barber.id, weekday: day.weekday, startTime, endTime },
        });
      }
    }
  }

  console.log("→ Criando cliente exemplo...");
  const existingCustomer = await prisma.customer.findFirst({
    where: { storeId: store.id, phone: "(27) 99888-7777" },
  });
  if (!existingCustomer) {
    await prisma.customer.create({
      data: {
        name: "Carlos Exemplo",
        phone: "(27) 99888-7777",
        email: "carlos@example.com",
        storeId: store.id,
      },
    });
  }

  console.log("\n✅ Seed concluído!");
  console.log(`   Store:    ${store.name} (slug: ${store.slug})`);
  console.log(`   Admin:    ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`   Serviços: ${services.length}`);
  console.log(`   Barbeiros: 2 (João, Pedro)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
