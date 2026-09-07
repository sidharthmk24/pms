import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL is not set in environment!");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }, { schema: "kairali_pms" }),
});

function stamp(date: Date = new Date()): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function dateOnly(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function run() {
  console.log("🚀 Starting Kairali PMS Cleanup & Malayalam Content Seeding...");

  // 1. Verify existing users & login credentials (MUST BE PRESERVED)
  const existingUsers = await prisma.users.findMany({
    select: { id: true, email: true, name: true, role: true },
  });
  console.log(`\n🔒 Preserving ${existingUsers.length} user accounts & login credentials:`);
  console.table(existingUsers);

  const ownerUser = existingUsers.find((u) => u.role === "owner") || existingUsers[0];
  const editorUser = existingUsers.find((u) => u.role === "editor") || ownerUser;
  const prodUser = existingUsers.find((u) => u.role === "production") || ownerUser;
  const accountsUser = existingUsers.find((u) => u.role === "accounts") || ownerUser;
  const storeUser = existingUsers.find((u) => u.role === "store") || ownerUser;

  // 2. Clean out old dummy transactional & catalog data in dependency order
  console.log("\n🧹 Removing old dummy data (audits, sales, prints, contracts, titles, submissions, authors)...");
  await prisma.audit_log.deleteMany({});
  await prisma.email_outbox.deleteMany({});
  await prisma.submission_throttle.deleteMany({});
  await prisma.sale_lines.deleteMany({});
  await prisma.sales.deleteMany({});
  await prisma.stock_movements.deleteMany({});
  await prisma.payouts.deleteMany({});
  await prisma.production_projects.deleteMany({});
  await prisma.print_jobs.deleteMany({});
  await prisma.contracts.deleteMany({});
  await prisma.titles.deleteMany({});
  await prisma.authors.deleteMany({});
  await prisma.dealers.deleteMany({});
  await prisma.submissions.deleteMany({});
  console.log("  ✓ All old dummy data cleared cleanly.");

  // 3. Seed Renowned Malayalam Authors
  console.log("\n✍️ Seeding authentic Malayalam authors...");
  const authorsData = [
    {
      name: "Benyamin",
      name_ml: "ബെന്യാമിൻ",
      phone: "+91 94471 23456",
      email: "benyamin.author@kairalibooks.in",
      address: "Kulanada P.O., Pandalam, Pathanamthitta - 689503",
      pan: "ABCPB1234K",
      notes: "Kerala Sahitya Akademi & JCB Prize winning Malayalam novelist.",
    },
    {
      name: "K. R. Meera",
      name_ml: "കെ. ആർ. മീറ",
      phone: "+91 94472 34567",
      email: "krmeera@kairalibooks.in",
      address: "Thevally, Kollam, Kerala - 691009",
      pan: "ABCPM2345L",
      notes: "Kendra Sahitya Akademi Award winning author of Aarachar.",
    },
    {
      name: "Subhash Chandran",
      name_ml: "സുഭാഷ് ചന്ദ്രൻ",
      phone: "+91 94473 45678",
      email: "subhash.chandran@kairalibooks.in",
      address: "Kadavanthra, Kochi, Ernakulam - 682020",
      pan: "ABCPS3456M",
      notes: "Acclaimed contemporary novelist and short story writer.",
    },
    {
      name: "T. D. Ramakrishnan",
      name_ml: "ടി. ഡി. രാമകൃഷ്ണൻ",
      phone: "+91 94474 56789",
      email: "tdramakrishnan@kairalibooks.in",
      address: "Eyyal, Kechery, Thrissur - 680501",
      pan: "ABCPR4567N",
      notes: "Vayalar Award winner; renowned for historical & post-modern fiction.",
    },
    {
      name: "V. J. James",
      name_ml: "വി. ജെ. ജെയിംസ്",
      phone: "+91 94475 67890",
      email: "vjjames@kairalibooks.in",
      address: "Vazhappally, Changanassery, Kottayam - 686103",
      pan: "ABCPJ5678P",
      notes: "Celebrated Malayalam novelist known for philosophical themes.",
    },
    {
      name: "M. Mukundan",
      name_ml: "എം. മുകുന്ദൻ",
      phone: "+91 94476 78901",
      email: "mmukundan@kairalibooks.in",
      address: "Mayyazhi, Mahe, Kerala - 673310",
      pan: "ABCPM6789Q",
      notes: "Doyen of Malayalam modernism; Ezhuthachan Puraskaram laureate.",
    },
    {
      name: "S. Hareesh",
      name_ml: "എസ്. ഹരീഷ്",
      phone: "+91 94477 89012",
      email: "shareesh@kairalibooks.in",
      address: "Neendoor P.O., Kottayam, Kerala - 686601",
      pan: "ABCPH7890R",
      notes: "JCB Prize winner; celebrated author of Meesha and Adam.",
    },
    {
      name: "Ambikasuthan Mangad",
      name_ml: "അംബികാസുതൻ മാങ്ങാട്",
      phone: "+91 94478 90123",
      email: "ambikasuthan@kairalibooks.in",
      address: "Kanhangad, Kasaragod - 671315",
      pan: "ABCPA8901S",
      notes: "Environmentalist author famous for Enmakaje on the Endosulfan tragedy.",
    },
    {
      name: "Deepa Nishanth",
      name_ml: "ദീപ നിശാന്ത്",
      phone: "+91 94479 01234",
      email: "deepanishanth@kairalibooks.in",
      address: "Ayyanthole, Thrissur - 680003",
      pan: "ABCPD9012T",
      notes: "Popular essayist, teacher, and social commentator.",
    },
    {
      name: "Manoj Kuroor",
      name_ml: "മനോജ് കുറൂർ",
      phone: "+91 94470 12345",
      email: "manojkuroor@kairalibooks.in",
      address: "Kottayam Central, Kottayam - 686001",
      pan: "ABCPK0123U",
      notes: "Poet, lyricist, and historical novelist (Nilam Poothu Malarnna Naal).",
    },
  ];

  const authorMap = new Map<string, string>(); // name -> id
  for (const a of authorsData) {
    const id = randomUUID();
    await prisma.authors.create({
      data: {
        id,
        name: a.name,
        name_ml: a.name_ml,
        phone: a.phone,
        email: a.email,
        address: a.address,
        pan: a.pan,
        notes: a.notes,
        created_at: stamp(daysAgo(180)),
      },
    });
    authorMap.set(a.name, id);
    console.log(`  ✓ Author added: ${a.name} (${a.name_ml})`);
  }

  // 4. Seed Titles (Published Malayalam Books under Kairali Books)
  console.log("\n📖 Seeding published Malayalam titles & contracts...");
  const titlesData = [
    {
      name: "Aadujeevitham",
      name_ml: "ആടുജീവിതം",
      authorName: "Benyamin",
      category: "Fiction",
      isbn: "978-81-264-1999-9",
      mrp_paise: 29900,
      unit_cost_paise: 9500,
      pages: 248,
      binding: "Paperback",
      stock: 450,
      reorder_level: 50,
      royalty_pct: 15,
      advance_paise: 10000000,
    },
    {
      name: "Aarachar",
      name_ml: "ആരാച്ചാർ",
      authorName: "K. R. Meera",
      category: "Fiction",
      isbn: "978-81-264-3836-5",
      mrp_paise: 59900,
      unit_cost_paise: 18500,
      pages: 580,
      binding: "Hardbound",
      stock: 320,
      reorder_level: 40,
      royalty_pct: 15,
      advance_paise: 15000000,
    },
    {
      name: "Manushyanu Oru Aamukham",
      name_ml: "മനുഷ്യന് ഒരു ആമുഖം",
      authorName: "Subhash Chandran",
      category: "Fiction",
      isbn: "978-81-264-3068-0",
      mrp_paise: 49500,
      unit_cost_paise: 15000,
      pages: 440,
      binding: "Paperback",
      stock: 280,
      reorder_level: 35,
      royalty_pct: 12.5,
      advance_paise: 7500000,
    },
    {
      name: "Francis Itty Cora",
      name_ml: "ഫ്രാൻസിസ് ഇട്ടിക്കോര",
      authorName: "T. D. Ramakrishnan",
      category: "Fiction",
      isbn: "978-81-264-2453-5",
      mrp_paise: 42000,
      unit_cost_paise: 13000,
      pages: 360,
      binding: "Paperback",
      stock: 210,
      reorder_level: 30,
      royalty_pct: 12.5,
      advance_paise: 6000000,
    },
    {
      name: "Nireeshwaran",
      name_ml: "നിരീശ്വരൻ",
      authorName: "V. J. James",
      category: "Fiction",
      isbn: "978-81-264-5163-0",
      mrp_paise: 38000,
      unit_cost_paise: 12000,
      pages: 312,
      binding: "Paperback",
      stock: 190,
      reorder_level: 25,
      royalty_pct: 10,
      advance_paise: 5000000,
    },
    {
      name: "Mayyazhippuzhayude Theerangalil",
      name_ml: "മയ്യഴിപ്പുഴയുടെ തീരങ്ങളിൽ",
      authorName: "M. Mukundan",
      category: "Classics",
      isbn: "978-81-713-0248-2",
      mrp_paise: 32000,
      unit_cost_paise: 10500,
      pages: 280,
      binding: "Paperback",
      stock: 350,
      reorder_level: 40,
      royalty_pct: 15,
      advance_paise: 8000000,
    },
    {
      name: "Meesha",
      name_ml: "മീശ",
      authorName: "S. Hareesh",
      category: "Fiction",
      isbn: "978-81-264-7561-2",
      mrp_paise: 45000,
      unit_cost_paise: 14000,
      pages: 384,
      binding: "Paperback",
      stock: 410,
      reorder_level: 45,
      royalty_pct: 12.5,
      advance_paise: 8000000,
    },
    {
      name: "Enmakaje",
      name_ml: "എന്മകജെ",
      authorName: "Ambikasuthan Mangad",
      category: "Fiction",
      isbn: "978-81-264-2195-4",
      mrp_paise: 26000,
      unit_cost_paise: 8500,
      pages: 224,
      binding: "Paperback",
      stock: 175,
      reorder_level: 25,
      royalty_pct: 10,
      advance_paise: 3500000,
    },
    {
      name: "Kunnolamundallo Bhoothakkannadi",
      name_ml: "കുന്നോളമുണ്ടല്ലോ ഭൂതക്കണ്ണാടി",
      authorName: "Deepa Nishanth",
      category: "Essays",
      isbn: "978-81-264-6721-1",
      mrp_paise: 22000,
      unit_cost_paise: 7500,
      pages: 196,
      binding: "Paperback",
      stock: 260,
      reorder_level: 30,
      royalty_pct: 10,
      advance_paise: 3000000,
    },
    {
      name: "Nilam Poothu Malarnna Naal",
      name_ml: "നിലം പൂത്തു മലർന്ന നാൾ",
      authorName: "Manoj Kuroor",
      category: "Fiction",
      isbn: "978-81-264-5890-5",
      mrp_paise: 34000,
      unit_cost_paise: 11000,
      pages: 290,
      binding: "Paperback",
      stock: 140,
      reorder_level: 25,
      royalty_pct: 10,
      advance_paise: 4000000,
    },
    {
      name: "Sugandhi Enna Andal Devanayaki",
      name_ml: "സുഗന്ധി എന്ന ആണ്ടാൾ ദേവനായകി",
      authorName: "T. D. Ramakrishnan",
      category: "Fiction",
      isbn: "978-81-264-5063-3",
      mrp_paise: 39000,
      unit_cost_paise: 12500,
      pages: 328,
      binding: "Paperback",
      stock: 225,
      reorder_level: 30,
      royalty_pct: 12.5,
      advance_paise: 6000000,
    },
    {
      name: "Chorashasthram",
      name_ml: "ചോരശാസ്ത്രം",
      authorName: "V. J. James",
      category: "Fiction",
      isbn: "978-81-264-4211-9",
      mrp_paise: 24000,
      unit_cost_paise: 8000,
      pages: 188,
      binding: "Paperback",
      stock: 180,
      reorder_level: 25,
      royalty_pct: 10,
      advance_paise: 3500000,
    },
  ];

  const titleMap = new Map<string, any>();
  for (const t of titlesData) {
    const titleId = randomUUID();
    const authorId = authorMap.get(t.authorName)!;

    const createdTitle = await prisma.titles.create({
      data: {
        id: titleId,
        isbn: t.isbn,
        name: t.name,
        name_ml: t.name_ml,
        author_id: authorId,
        category: t.category,
        language: "Malayalam",
        edition: "1st",
        edition_no: 1,
        mrp_paise: t.mrp_paise,
        unit_cost_paise: t.unit_cost_paise,
        pages: t.pages,
        binding: t.binding,
        reorder_level: t.reorder_level,
        stock: t.stock,
        status: "active",
        created_at: stamp(daysAgo(150)),
      },
    });

    titleMap.set(t.name, createdTitle);

    // Contract
    await prisma.contracts.create({
      data: {
        id: randomUUID(),
        title_id: titleId,
        author_id: authorId,
        royalty_pct: t.royalty_pct,
        basis: "mrp",
        advance_paise: t.advance_paise,
        signed_on: dateOnly(daysAgo(160)),
        term_notes: "Exclusive 5-year publishing agreement for Malayalam print, audio, and digital editions.",
        created_at: stamp(daysAgo(160)),
      },
    });

    // Opening Stock movement
    await prisma.stock_movements.create({
      data: {
        id: randomUUID(),
        title_id: titleId,
        qty_delta: t.stock,
        reason: "opening",
        ref_type: "manual",
        balance_after: t.stock,
        note: `Opening stock balance of ${t.stock} copies received at central warehouse`,
        user_id: storeUser.id,
        at: stamp(daysAgo(140)),
      },
    });

    console.log(`  ✓ Title & Contract ready: "${t.name}" (${t.name_ml}) — Stock: ${t.stock}`);
  }

  // 5. Seed Malayalam Manuscript Submissions
  console.log("\n📥 Seeding realistic Malayalam manuscript submissions...");
  const submissionsData = [
    {
      ref_no: "SUB-2026-0001",
      author_name: "Sivaprasad K.",
      author_name_ml: "ശിവപ്രസാദ് കെ.",
      email: "sivaprasad.writer@gmail.com",
      phone: "+91 94471 99112",
      place: "Palakkad",
      title: "Veyil Thinnunna Marangal",
      title_ml: "വെയിൽ തിന്നുന്ന മരങ്ങൾ",
      genre: "novel",
      language: "Malayalam",
      synopsis: "A powerful rural saga capturing the transition of agricultural landscapes in eastern Palakkad over three generations, exploring climate distress, family bonds, and resilience.",
      status: "under_review",
      source: "web",
      publishing_type: "kairali_funded",
      daysBack: 14,
    },
    {
      ref_no: "SUB-2026-0002",
      author_name: "Anitha Ramesh",
      author_name_ml: "അനിത രമേഷ്",
      email: "anitha.calicut@gmail.com",
      phone: "+91 98472 88223",
      place: "Kozhikode",
      title: "Kadal Kaanatha Theerangal",
      title_ml: "കടൽ കാണാത്ത തീരങ്ങൾ",
      genre: "poetry",
      language: "Malayalam",
      synopsis: "An anthology of 48 modern Malayalam poems contemplating feminine inner spaces, oceanic metaphors, and contemporary urban nostalgia.",
      status: "accepted",
      source: "web",
      publishing_type: "kairali_funded",
      review_notes: "Exceptional mastery of meter, rhythmic subtlety, and evocative imagery. Approved unanimously for our upcoming Autumn poetry series.",
      decided_on: dateOnly(daysAgo(2)),
      daysBack: 28,
    },
    {
      ref_no: "SUB-2026-0003",
      author_name: "Haridasan P.",
      author_name_ml: "ഹരിദാസൻ പി.",
      email: "haridasan.kuttanad@yahoo.com",
      phone: "+91 94953 77334",
      place: "Alappuzha",
      title: "Puzha Paranja Kathakal",
      title_ml: "പുഴ പറഞ്ഞ കഥകൾ",
      genre: "short_stories",
      language: "Malayalam",
      synopsis: "Twelve gripping short stories chronicling life along the backwaters and paddy fields of Kuttanad, highlighting historical floods and changing waterways.",
      status: "new",
      source: "web",
      publishing_type: "kairali_funded",
      daysBack: 3,
    },
    {
      ref_no: "SUB-2026-0004",
      author_name: "Dr. Madhavan Kutty",
      author_name_ml: "ഡോ. മാധവൻ കുട്ടി",
      email: "dr.madhavankutty@keralauniv.ac.in",
      phone: "+91 94464 66445",
      place: "Wayanad",
      title: "Sahyadriyude Nizhalil: Kaanana Sancharam",
      title_ml: "സഹ്യാദ്രിയുടെ നിഴലിൽ",
      genre: "travelogue",
      language: "Malayalam",
      synopsis: "In-depth botanical, historical and tribal memoirs walking through the dense rainforests of the Western Ghats from Brahmagiri to Nilgiri peaks.",
      status: "accepted",
      source: "email",
      publishing_type: "kairali_funded",
      review_notes: "Rich natural history documentation with authentic tribal lore. Highly recommended for publication with color plate inserts.",
      decided_on: dateOnly(daysAgo(5)),
      daysBack: 35,
    },
    {
      ref_no: "SUB-2026-0005",
      author_name: "Devaki Antharjanam",
      author_name_ml: "ദേവകി അന്തർജ്ജനം",
      email: "devaki.antharjanam@gmail.com",
      phone: "+91 94475 55667",
      place: "Shoranur",
      title: "Nila Theerathe Ormakal",
      title_ml: "നിലാതീരത്തെ ഓർമ്മകൾ",
      genre: "biography",
      language: "Malayalam",
      synopsis: "A poignant memoir documenting the early reformist struggles, community changes, and literary awakening in Valluvanad during the 1950s and 60s.",
      status: "under_review",
      source: "web",
      publishing_type: "kairali_funded",
      daysBack: 18,
    },
    {
      ref_no: "SUB-2026-0006",
      author_name: "Rahul G. Nair",
      author_name_ml: "രാഹുൽ ജി. നായർ",
      email: "rahul.gnair@outlook.com",
      phone: "+91 98466 44778",
      place: "Thrissur",
      title: "Swapna Sancharam: Kuttikalkkayulla Kathakal",
      title_ml: "സ്വപ്നസഞ്ചാരം",
      genre: "childrens",
      language: "Malayalam",
      synopsis: "A collection of illustrated whimsical fantasy tales featuring magical animals travelling through Kerala temples and rivers.",
      status: "declined",
      source: "web",
      publishing_type: "self_publishing",
      review_notes: "The manuscript is imaginative but the dialogue density is too high for primary school readers. Advised author to revise text-to-illustration ratio.",
      decided_on: dateOnly(daysAgo(7)),
      daysBack: 42,
    },
    {
      ref_no: "SUB-2026-0007",
      author_name: "Sreejith V.",
      author_name_ml: "ശ്രീജിത്ത് വി.",
      email: "sreejith.theatre@gmail.com",
      phone: "+91 94957 33889",
      place: "Kannur",
      title: "Kettukaazhcha",
      title_ml: "കെട്ടുകാഴ്ച",
      genre: "drama",
      language: "Malayalam",
      synopsis: "A three-act experimental political drama staging the tensions between folk performance traditions (Theyyam) and contemporary industrial exploitation.",
      status: "new",
      source: "web",
      publishing_type: "kairali_funded",
      daysBack: 1,
    },
    {
      ref_no: "SUB-2026-0008",
      author_name: "Dr. Faisal Rahman",
      author_name_ml: "ഡോ. ഫൈസൽ റഹ്മാൻ",
      email: "faisal.rahman.dr@gmail.com",
      phone: "+91 94478 22990",
      place: "Malappuram",
      title: "Manalpparappile Mazha",
      title_ml: "മണൽപ്പരപ്പിലെ മഴ",
      genre: "novel",
      language: "Malayalam",
      synopsis: "A vivid diaspora novel following a Malayali engineer's philosophical reflections across three decades in the UAE oil fields and his eventual return to his native village.",
      status: "under_review",
      source: "web",
      publishing_type: "kairali_funded",
      daysBack: 10,
    },
  ];

  for (const s of submissionsData) {
    const subDate = daysAgo(s.daysBack);
    await prisma.submissions.create({
      data: {
        id: randomUUID(),
        ref_no: s.ref_no,
        author_name: s.author_name,
        author_name_ml: s.author_name_ml,
        email: s.email,
        phone: s.phone,
        place: s.place,
        title: s.title,
        title_ml: s.title_ml,
        genre: s.genre,
        language: s.language,
        synopsis: s.synopsis,
        manuscript_path: "dummy.pdf",
        manuscript_filename: `${s.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.pdf`,
        manuscript_size: 450 * 1024,
        manuscript_mime: "application/pdf",
        status: s.status,
        source: s.source,
        publishing_type: s.publishing_type,
        reviewed_by: s.status !== "new" ? editorUser.id : null,
        review_notes: s.review_notes || null,
        decided_on: s.decided_on || null,
        submitted_at: stamp(subDate),
        updated_at: stamp(subDate),
      },
    });
    console.log(`  ✓ Submission registered: [${s.ref_no}] "${s.title}" (${s.author_name}) — Status: ${s.status}`);
  }

  // 6. Seed Print Jobs (Offset Press Print Runs)
  console.log("\n🖨️ Seeding press print jobs...");
  const printJobsData = [
    {
      job_no: "PJ-2026-001",
      titleName: "Aadujeevitham",
      qty: 3000,
      paper: "70 GSM Natural Shade Book Print",
      binding: "Paperback - Perfect Binding",
      vendor: "Anaswara Offset Printers, Kochi",
      cost_paise: 24000000,
      status: "completed",
      daysAgoRaised: 45,
      daysAgoReceived: 20,
      notes: "Paper delivered from Ballarpur Paper Mills. Excellent print registration.",
    },
    {
      job_no: "PJ-2026-002",
      titleName: "Aarachar",
      qty: 2000,
      paper: "80 GSM Maplitho Classic",
      binding: "Hardbound with Embossed Jacket",
      vendor: "DC Offset Press, Kottayam",
      cost_paise: 21000000,
      status: "completed",
      daysAgoRaised: 30,
      daysAgoReceived: 10,
      notes: "Hardbound cover stamping in gold foil.",
    },
    {
      job_no: "PJ-2026-003",
      titleName: "Meesha",
      qty: 2500,
      paper: "70 GSM Natural Shade",
      binding: "Paperback - Perfect Binding",
      vendor: "TBS Printing Division, Calicut",
      cost_paise: 22500000,
      status: "printing",
      daysAgoRaised: 12,
      daysAgoReceived: null,
      notes: "Currently on machine at press; proof sheets approved by production manager.",
    },
  ];

  const printJobMap = new Map<string, string>();
  for (const pj of printJobsData) {
    const pjId = randomUUID();
    const titleObj = titleMap.get(pj.titleName)!;
    await prisma.print_jobs.create({
      data: {
        id: pjId,
        job_no: pj.job_no,
        title_id: titleObj.id,
        qty: pj.qty,
        paper: pj.paper,
        binding: pj.binding,
        vendor: pj.vendor,
        cost_paise: pj.cost_paise,
        status: pj.status,
        raised_on: dateOnly(daysAgo(pj.daysAgoRaised)),
        received_on: pj.daysAgoReceived ? dateOnly(daysAgo(pj.daysAgoReceived)) : null,
        notes: pj.notes,
        created_by: prodUser.id,
        created_at: stamp(daysAgo(pj.daysAgoRaised)),
      },
    });
    printJobMap.set(pj.job_no, pjId);
    console.log(`  ✓ Print job logged: [${pj.job_no}] for ${pj.titleName} — ${pj.qty} copies (${pj.status})`);
  }

  // 7. Seed Production Projects (Publishing Workflows)
  console.log("\n⚙️ Seeding production projects pipeline...");
  const prodProjectsData = [
    {
      titleName: "Nilam Poothu Malarnna Naal",
      status: "editing",
      dtpAssignedTo: prodUser.id,
      dtpAssignees: "Kavitha DTP Works, Kottayam",
      dtpDone: daysAgo(25),
      editAssignedTo: editorUser.id,
      editAssignees: "Editor Staff",
      editDone: null,
      notes: "Comprehensive copy-edit underway; ancient Sangam period terminologies verified.",
    },
    {
      titleName: "Kunnolamundallo Bhoothakkannadi",
      status: "cover_design",
      dtpAssignedTo: prodUser.id,
      dtpAssignees: "Lipi Graphics, Thrissur",
      dtpDone: daysAgo(20),
      editAssignedTo: editorUser.id,
      editAssignees: "Editor Staff",
      editDone: daysAgo(10),
      coverAssignedTo: prodUser.id,
      coverAssignees: "Artist Namboothiri Studio",
      coverDone: null,
      notes: "Illustrations for chapter heads completed. Cover color proof awaited.",
    },
    {
      titleName: "Enmakaje",
      status: "final_proof",
      dtpAssignedTo: prodUser.id,
      dtpAssignees: "Lipi Graphics, Thrissur",
      dtpDone: daysAgo(40),
      editAssignedTo: editorUser.id,
      editAssignees: "Editor Staff",
      editDone: daysAgo(30),
      coverAssignedTo: prodUser.id,
      coverAssignees: "Sujith Cover Arts, Kochi",
      coverDone: daysAgo(20),
      proofAssignedTo: editorUser.id,
      proofAssignees: "Sankaranarayanan Proofreaders",
      proofDone: daysAgo(5),
      notes: "Final proofs verified and signed off for printing.",
    },
    {
      titleName: "Aadujeevitham",
      status: "completed",
      dtpAssignedTo: prodUser.id,
      dtpAssignees: "In-house Studio",
      dtpDone: daysAgo(60),
      editAssignedTo: editorUser.id,
      editAssignees: "Editor Staff",
      editDone: daysAgo(50),
      coverAssignedTo: prodUser.id,
      coverAssignees: "P. N. Das Design, Kozhikode",
      coverDone: daysAgo(45),
      isbnRegistered: "978-81-264-1999-9",
      printJobNo: "PJ-2026-001",
      warehouseReceived: 2900,
      authorCopies: 100,
      notes: "Production cycle fully completed. Dispatched to retail and distributors.",
    },
  ];

  for (const pp of prodProjectsData) {
    const titleObj = titleMap.get(pp.titleName)!;
    const pjId = pp.printJobNo ? printJobMap.get(pp.printJobNo) : null;
    await prisma.production_projects.create({
      data: {
        id: randomUUID(),
        title_id: titleObj.id,
        status: pp.status,
        dtp_assigned_to: pp.dtpAssignedTo || null,
        dtp_assignees: pp.dtpAssignees || null,
        dtp_completed_at: pp.dtpDone ? stamp(pp.dtpDone) : null,
        editing_assigned_to: pp.editAssignedTo || null,
        editing_assignees: pp.editAssignees || null,
        editing_completed_at: pp.editDone ? stamp(pp.editDone) : null,
        cover_assigned_to: (pp as any).coverAssignedTo || null,
        cover_assignees: (pp as any).coverAssignees || null,
        cover_completed_at: (pp as any).coverDone ? stamp((pp as any).coverDone) : null,
        isbn_registered: pp.isbnRegistered || null,
        proof_assigned_to: (pp as any).proofAssignedTo || null,
        proof_assignees: (pp as any).proofAssignees || null,
        proof_approved_at: (pp as any).proofDone ? stamp((pp as any).proofDone) : null,
        print_job_id: pjId,
        warehouse_received_qty: pp.warehouseReceived || 0,
        author_copies_qty: pp.authorCopies || 0,
        channels_activated: "retail,dealer,fair,online",
        created_at: stamp(daysAgo(75)),
        updated_at: stamp(daysAgo(5)),
      },
    });
    console.log(`  ✓ Production project: ${pp.titleName} (Stage: ${pp.status})`);
  }

  // 8. Seed Dealers (Kerala Bookstore Chains & Distributors)
  console.log("\n🏬 Seeding Kerala book distribution dealers...");
  const dealersData = [
    {
      name: "Modern Book Centre",
      contact: "G. Sukumaran",
      phone: "0471-2331816",
      gstin: "32AABCM1234F1Z5",
      address: "Gandhari Amman Kovil St, Pulimoodu, Thiruvananthapuram - 695001",
      discount_pct: 35,
      credit_limit_paise: 50000000,
    },
    {
      name: "TBS Publishers & Distributors",
      contact: "Balakrishnan Nair",
      phone: "0495-2720085",
      gstin: "32AABCT2345G2Z6",
      address: "TBS Building, GH Road, Kozhikode - 673001",
      discount_pct: 35,
      credit_limit_paise: 80000000,
    },
    {
      name: "Current Books Retail Network",
      contact: "Biju Joseph",
      phone: "0487-2423311",
      gstin: "32AABCC3456H3Z7",
      address: "Round West, Thrissur - 680001",
      discount_pct: 30,
      credit_limit_paise: 60000000,
    },
    {
      name: "National Book Stall (SPCS)",
      contact: "P. R. Madhavan",
      phone: "0481-2562761",
      gstin: "32AABCN4567J4Z8",
      address: "Baker Junction, MC Road, Kottayam - 686001",
      discount_pct: 30,
      credit_limit_paise: 40000000,
    },
    {
      name: "H&C Books Distribution",
      contact: "Jose Thomas",
      phone: "0484-2391211",
      gstin: "32AABCH5678K5Z9",
      address: "High Court Road, Ernakulam, Kochi - 682031",
      discount_pct: 32,
      credit_limit_paise: 50000000,
    },
  ];

  const dealerMap = new Map<string, string>();
  for (const d of dealersData) {
    const dId = randomUUID();
    await prisma.dealers.create({
      data: {
        id: dId,
        name: d.name,
        contact: d.contact,
        phone: d.phone,
        gstin: d.gstin,
        address: d.address,
        discount_pct: d.discount_pct,
        credit_limit_paise: d.credit_limit_paise,
        created_at: stamp(daysAgo(100)),
      },
    });
    dealerMap.set(d.name, dId);
    console.log(`  ✓ Dealer registered: ${d.name} (${d.address.split(",")[1]?.trim()})`);
  }

  // 9. Seed Sales Invoices & Lines
  console.log("\n📦 Seeding dealer wholesale & festival sales invoices...");
  const salesData = [
    {
      doc_no: "INV-2026-0001",
      type: "sale",
      channel: "dealer",
      dealerName: "Modern Book Centre",
      custName: "Modern Book Centre, Trivandrum",
      soldDaysAgo: 15,
      paymentMode: "bank",
      items: [
        { titleName: "Aadujeevitham", qty: 50, discountPct: 35 },
        { titleName: "Aarachar", qty: 30, discountPct: 35 },
      ],
    },
    {
      doc_no: "INV-2026-0002",
      type: "sale",
      channel: "dealer",
      dealerName: "TBS Publishers & Distributors",
      custName: "TBS Publishers, Kozhikode",
      soldDaysAgo: 10,
      paymentMode: "bank",
      items: [
        { titleName: "Meesha", qty: 40, discountPct: 35 },
        { titleName: "Francis Itty Cora", qty: 25, discountPct: 35 },
        { titleName: "Nireeshwaran", qty: 25, discountPct: 35 },
      ],
    },
    {
      doc_no: "INV-2026-0003",
      type: "sale",
      channel: "fair",
      dealerName: null,
      custName: "Kochi International Book Festival Counter",
      eventName: "Kochi International Book Festival 2026",
      soldDaysAgo: 4,
      paymentMode: "upi",
      items: [
        { titleName: "Aadujeevitham", qty: 35, discountPct: 15 },
        { titleName: "Mayyazhippuzhayude Theerangalil", qty: 20, discountPct: 15 },
        { titleName: "Manushyanu Oru Aamukham", qty: 15, discountPct: 15 },
      ],
    },
    {
      doc_no: "INV-2026-0004",
      type: "sale",
      channel: "dealer",
      dealerName: "National Book Stall (SPCS)",
      custName: "NBS Kottayam Branch",
      soldDaysAgo: 2,
      paymentMode: "credit",
      items: [
        { titleName: "Nilam Poothu Malarnna Naal", qty: 20, discountPct: 30 },
        { titleName: "Chorashasthram", qty: 20, discountPct: 30 },
      ],
    },
  ];

  for (const s of salesData) {
    const saleId = randomUUID();
    const dealerId = s.dealerName ? dealerMap.get(s.dealerName) : null;
    let subtotal = 0;
    let discountPaise = 0;

    const lineInserts = [];
    for (const it of s.items) {
      const titleObj = titleMap.get(it.titleName)!;
      const lineSubtotal = titleObj.mrp_paise * it.qty;
      const lineDisc = Math.round(lineSubtotal * (it.discountPct / 100));
      const lineTotal = lineSubtotal - lineDisc;
      subtotal += lineSubtotal;
      discountPaise += lineDisc;

      lineInserts.push({
        id: randomUUID(),
        title_id: titleObj.id,
        qty: it.qty,
        unit_price_paise: titleObj.mrp_paise,
        discount_pct: it.discountPct,
        line_total_paise: lineTotal,
      });

      // Stock deduction movement
      const newStock = Math.max(0, titleObj.stock - it.qty);
      titleObj.stock = newStock;
      await prisma.titles.update({
        where: { id: titleObj.id },
        data: { stock: newStock },
      });

      await prisma.stock_movements.create({
        data: {
          id: randomUUID(),
          title_id: titleObj.id,
          qty_delta: -it.qty,
          reason: "sale",
          ref_type: "sale",
          ref_id: saleId,
          balance_after: newStock,
          note: `Dispatched ${it.qty} copies on ${s.doc_no}`,
          user_id: storeUser.id,
          at: stamp(daysAgo(s.soldDaysAgo)),
        },
      });
    }

    const totalPaise = subtotal - discountPaise;
    const avgDiscPct = subtotal > 0 ? (discountPaise / subtotal) * 100 : 0;

    await prisma.sales.create({
      data: {
        id: saleId,
        doc_no: s.doc_no,
        type: s.type,
        channel: s.channel,
        dealer_id: dealerId,
        customer_name: s.custName,
        event_name: s.eventName || null,
        discount_pct: avgDiscPct,
        subtotal_paise: subtotal,
        discount_paise: discountPaise,
        total_paise: totalPaise,
        payment_mode: s.paymentMode,
        sold_on: dateOnly(daysAgo(s.soldDaysAgo)),
        created_by: accountsUser.id,
        created_at: stamp(daysAgo(s.soldDaysAgo)),
        sale_lines: {
          create: lineInserts,
        },
      },
    });

    console.log(`  ✓ Sales invoice: [${s.doc_no}] to ${s.custName} — Total: ₹${(totalPaise / 100).toLocaleString("en-IN")}`);
  }

  // 10. Seed Author Royalty Payouts
  console.log("\n💰 Seeding author royalty settlements...");
  const payoutsData = [
    {
      authorName: "Benyamin",
      gross_paise: 12000000, // ₹1,20,000
      tds_paise: 1200000,    // ₹12,000 (10% TDS)
      net_paise: 10800000,   // ₹1,08,000
      method: "NEFT",
      reference: "UTR-SBIN2601982731",
      note: "Annual royalty settlement for Aadujeevitham 2025 print editions.",
      daysAgo: 25,
    },
    {
      authorName: "K. R. Meera",
      gross_paise: 9500000,  // ₹95,000
      tds_paise: 950000,     // ₹9,500
      net_paise: 8550000,    // ₹85,500
      method: "NEFT",
      reference: "UTR-FDRL2601774328",
      note: "Royalty payout for Aarachar 5th hardcover reprint.",
      daysAgo: 18,
    },
    {
      authorName: "Subhash Chandran",
      gross_paise: 7000000,  // ₹70,000
      tds_paise: 700000,     // ₹7,000
      net_paise: 6300000,    // ₹63,000
      method: "NEFT",
      reference: "UTR-HDFC2601662914",
      note: "Biannual royalty payout for Manushyanu Oru Aamukham sales.",
      daysAgo: 10,
    },
  ];

  for (const p of payoutsData) {
    const authorId = authorMap.get(p.authorName)!;
    await prisma.payouts.create({
      data: {
        id: randomUUID(),
        author_id: authorId,
        gross_paise: p.gross_paise,
        tds_paise: p.tds_paise,
        net_paise: p.net_paise,
        paid_on: dateOnly(daysAgo(p.daysAgo)),
        method: p.method,
        reference: p.reference,
        note: p.note,
        created_by: accountsUser.id,
        created_at: stamp(daysAgo(p.daysAgo)),
      },
    });
    console.log(`  ✓ Royalty payout: ${p.authorName} — Net: ₹${(p.net_paise / 100).toLocaleString("en-IN")}`);
  }

  // 11. Update document sequence counters
  console.log("\n🔢 Updating sequence counters in database...");
  const countersToUpdate = [
    { name: "submission:2026", value: 8 },
    { name: "invoice:2026", value: 4 },
    { name: "print_job:2026", value: 3 },
  ];

  for (const c of countersToUpdate) {
    await prisma.counters.upsert({
      where: { name: c.name },
      create: { name: c.name, value: c.value },
      update: { value: c.value },
    });
  }
  console.log("  ✓ Sequence counters updated.");

  console.log("\n🎉 Kairali PMS Malayalam Content Seeding Completed Successfully!\n");
  await prisma.$disconnect();
}

run().catch(async (err) => {
  console.error("❌ Seeding failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
