"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Baby,
  BadgeCheck,
  Bone,
  Brain,
  CheckCircle2,
  ChevronDown,
  Clock,
  Droplet,
  FileText,
  Globe2,
  Heart,
  HeartPulse,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Plane,
  Quote,
  Ribbon,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Smile,
  Sparkles,
  Star,
  Stethoscope,
  Video,
  X,
} from "lucide-react";

/* ============================================================
   TYPES
   ============================================================ */
type TourismProcedure = {
  id: string;
  name: string;
  category: string;
  priceUSD: number;
  description?: string | null;
  avgStayDays: number;
};

type TourismSetting = {
  id: string;
  tourismReady: boolean;
  nabhCertUrl?: string | null;
  jciCertUrl?: string | null;
  internationalPhone?: string | null;
  internationalEmail?: string | null;
  languages?: string | null;
  rating: number;
};

type Hospital = {
  id: string;
  name: string;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  country?: string | null;
  address?: string | null;
  nabhAccredited?: boolean;
  tourismSetting?: TourismSetting | null;
  tourismProcedures?: TourismProcedure[];
};

type CostRow = {
  procedure: string;
  india: number;
  usa: number;
  uk: number;
  uae: number;
};

type Testimonial = {
  id: string;
  patientName: string;
  patientCountry: string;
  procedure: string;
  rating: number;
  testimonial: string;
  treatmentDate?: string | null;
  verified: boolean;
};

type InquiryModalState = {
  open: boolean;
  hospital: Hospital | null;
  procedure?: string;
};

/* ============================================================
   CONSTANTS — palette, procedure categories, countries
   ============================================================ */
const NAVY = "#0F172A";
const NAVY_2 = "#1E293B";
const NAVY_3 = "#334155";
const GOLD = "#F59E0B";
const GREEN_IND = "#16A34A";

const PROCEDURE_CATEGORIES: {
  id: string;
  name: string;
  icon: typeof Heart;
  blurb: string;
}[] = [
  { id: "cardiac", name: "Cardiac Surgery", icon: Heart, blurb: "Bypass · Valve · Angioplasty" },
  { id: "ortho", name: "Orthopaedics", icon: Bone, blurb: "Hip · Knee · Spine" },
  { id: "oncology", name: "Oncology", icon: Ribbon, blurb: "Surgery · Chemo · Radiation" },
  { id: "fertility", name: "Fertility & IVF", icon: Baby, blurb: "IVF · IUI · Egg Freezing" },
  { id: "dental", name: "Dental", icon: Smile, blurb: "Implants · Root Canal · Makeover" },
  { id: "cosmetic", name: "Cosmetic Surgery", icon: Sparkles, blurb: "Liposuction · Rhinoplasty" },
  { id: "neuro", name: "Neurology", icon: Brain, blurb: "Tumour · Spine · Epilepsy" },
  { id: "kidney", name: "Kidney Transplant", icon: Droplet, blurb: "Transplant · Dialysis" },
  { id: "liver", name: "Liver Transplant", icon: Activity, blurb: "Transplant · Hepatology" },
  { id: "bariatric", name: "Bariatric Surgery", icon: Scale, blurb: "Bypass · Sleeve · Balloon" },
];

const COUNTRIES: { code: string; dial: string; name: string; flag: string }[] = [
  { code: "AE", dial: "+971", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "SA", dial: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "QA", dial: "+974", name: "Qatar", flag: "🇶🇦" },
  { code: "OM", dial: "+968", name: "Oman", flag: "🇴🇲" },
  { code: "KW", dial: "+965", name: "Kuwait", flag: "🇰🇼" },
  { code: "BH", dial: "+973", name: "Bahrain", flag: "🇧🇭" },
  { code: "GB", dial: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "US", dial: "+1", name: "United States", flag: "🇺🇸" },
  { code: "BD", dial: "+880", name: "Bangladesh", flag: "🇧🇩" },
  { code: "KE", dial: "+254", name: "Kenya", flag: "🇰🇪" },
  { code: "NG", dial: "+234", name: "Nigeria", flag: "🇳🇬" },
  { code: "IN", dial: "+91", name: "India", flag: "🇮🇳" },
  { code: "RU", dial: "+7", name: "Russia", flag: "🇷🇺" },
  { code: "BR", dial: "+55", name: "Brazil", flag: "🇧🇷" },
  { code: "ZA", dial: "+27", name: "South Africa", flag: "🇿🇦" },
];

const COUNTRY_FLAGS: Record<string, string> = {
  UAE: "🇦🇪", "United Arab Emirates": "🇦🇪",
  "Saudi Arabia": "🇸🇦", UK: "🇬🇧", "United Kingdom": "🇬🇧",
  Qatar: "🇶🇦", Oman: "🇴🇲", Kenya: "🇰🇪",
  Brazil: "🇧🇷", Bangladesh: "🇧🇩",
  Kuwait: "🇰🇼", Bahrain: "🇧🇭",
  Nigeria: "🇳🇬", Russia: "🇷🇺",
  "South Africa": "🇿🇦", India: "🇮🇳",
};

/* ============================================================
   FALLBACK DATA — used when API returns empty / errors
   ============================================================ */
const FALLBACK_HOSPITALS: Hospital[] = [
  {
    id: "demo-1",
    name: "Aarogya International Hospital",
    city: "New Delhi",
    state: "Delhi",
    country: "India",
    nabhAccredited: true,
    tourismSetting: {
      id: "ts-1",
      tourismReady: true,
      jciCertUrl: "#",
      nabhCertUrl: "#",
      internationalPhone: "+91 98200 12345",
      internationalEmail: "international@aarogyahospital.in",
      languages: '["English","Hindi","Arabic","Russian"]',
      rating: 4.7,
    },
    tourismProcedures: [
      { id: "p1", name: "Coronary Artery Bypass Graft (CABG)", category: "cardiac", priceUSD: 4500, avgStayDays: 10 },
      { id: "p2", name: "Total Hip Replacement", category: "ortho", priceUSD: 5800, avgStayDays: 8 },
      { id: "p3", name: "IVF Treatment (1 cycle)", category: "fertility", priceUSD: 2200, avgStayDays: 3 },
    ],
  },
  {
    id: "demo-2",
    name: "Nexura Multi-Specialty & Transplant Institute",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    nabhAccredited: true,
    tourismSetting: {
      id: "ts-2",
      tourismReady: true,
      jciCertUrl: "#",
      nabhCertUrl: "#",
      internationalPhone: "+91 98200 67890",
      internationalEmail: "global@nexurahospital.in",
      languages: '["English","Hindi","Arabic","French"]',
      rating: 4.9,
    },
    tourismProcedures: [
      { id: "p4", name: "Kidney Transplant", category: "kidney", priceUSD: 14000, avgStayDays: 21 },
      { id: "p5", name: "Liver Transplant", category: "liver", priceUSD: 35000, avgStayDays: 28 },
      { id: "p6", name: "Brain Tumour Surgery", category: "neuro", priceUSD: 7500, avgStayDays: 14 },
    ],
  },
  {
    id: "demo-3",
    name: "HealWell Cosmetic & Dental Studio",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    nabhAccredited: true,
    tourismSetting: {
      id: "ts-3",
      tourismReady: true,
      internationalPhone: "+91 80 4567 8900",
      internationalEmail: "care@healwell.studio",
      languages: '["English","Arabic"]',
      rating: 4.8,
    },
    tourismProcedures: [
      { id: "p7", name: "Dental Implants (per tooth)", category: "dental", priceUSD: 800, avgStayDays: 2 },
      { id: "p8", name: "Liposuction", category: "cosmetic", priceUSD: 2500, avgStayDays: 3 },
      { id: "p9", name: "Gastric Bypass Surgery", category: "bariatric", priceUSD: 4500, avgStayDays: 7 },
    ],
  },
];

const FALLBACK_TESTIMONIALS: Testimonial[] = [
  {
    id: "t1",
    patientName: "Ahmed Al-Rashid",
    patientCountry: "UAE",
    procedure: "Cardiac Bypass Surgery",
    rating: 5,
    testimonial:
      "The entire journey from inquiry to discharge was seamless. The cost estimate was transparent and the surgery was successful. Dr. Rajesh and his team saved my life.",
    treatmentDate: null,
    verified: true,
  },
  {
    id: "t2",
    patientName: "Sarah Mitchell",
    patientCountry: "UK",
    procedure: "Hip Replacement",
    rating: 5,
    testimonial:
      "I saved 70% compared to UK private hospitals and got better care. The international desk arranged everything — visa, airport pickup, translator, accommodation.",
    treatmentDate: null,
    verified: true,
  },
  {
    id: "t3",
    patientName: "Fatima Bint Ali",
    patientCountry: "Qatar",
    procedure: "Knee Replacement",
    rating: 4,
    testimonial:
      "Excellent medical care. Arabic-speaking coordinator made me feel comfortable. The follow-up via video consultation after I returned home was very helpful.",
    treatmentDate: null,
    verified: true,
  },
  {
    id: "t4",
    patientName: "John Mwangi",
    patientCountry: "Kenya",
    procedure: "Brain Tumour Surgery",
    rating: 5,
    testimonial:
      "I was told the surgery wasn't possible in my country. Aarogya Hospital gave me a second chance at life. Forever grateful.",
    treatmentDate: null,
    verified: true,
  },
];

const FALLBACK_COST_ROWS: CostRow[] = [
  { procedure: "Coronary Bypass Surgery", india: 4500, usa: 130000, uk: 45000, uae: 25000 },
  { procedure: "Hip Replacement", india: 5800, usa: 40000, uk: 18000, uae: 15000 },
  { procedure: "Knee Replacement", india: 5200, usa: 35000, uk: 16000, uae: 14000 },
  { procedure: "IVF Treatment", india: 2200, usa: 15000, uk: 8000, uae: 6000 },
  { procedure: "Dental Implants (per tooth)", india: 800, usa: 5000, uk: 3000, uae: 2000 },
  { procedure: "Brain Tumour Surgery", india: 7500, usa: 150000, uk: 60000, uae: 35000 },
  { procedure: "Kidney Transplant", india: 14000, usa: 400000, uk: 100000, uae: 60000 },
  { procedure: "Liver Transplant", india: 35000, usa: 575000, uk: 200000, uae: 120000 },
  { procedure: "Gastric Bypass Surgery", india: 4500, usa: 25000, uk: 12000, uae: 9000 },
  { procedure: "Breast Cancer Surgery", india: 3800, usa: 20000, uk: 10000, uae: 8000 },
];

/* ============================================================
   i18n — English-only site copy
   ============================================================ */
const I18N = {
  en: {
    navHospitals: "Hospitals",
    navCost: "Cost Comparison",
    navHow: "How It Works",
    navStories: "Patient Stories",
    navContact: "Contact",
    navCta: "Get Free Estimate",
    heroBadge: "International patient desk — partner hospitals being onboarded",
    heroTitle1: "India's Most Trusted Hospitals.",
    heroTitle2: "Transparent Pricing. Expert Care.",
    heroSub:
      "Plan your medical journey to India with confidence — a JCI & NABH-accredited partner network being onboarded, transparent USD pricing, and a dedicated desk for international patients.",
    searchPlaceholder: "Search procedure or condition (e.g. CABG, IVF, knee replacement)",
    countryLabel: "Your country",
    countryPlaceholder: "Select country",
    searchBtn: "Find Hospitals",
    stat1: "NABH & JCI partner network — being onboarded",
    stat2: "Treatment costs typically a fraction of US prices",
    stat3: "A dedicated care desk for international patients",
    catTitle: "Explore by Procedure Category",
    catSub: "Tap a specialty to filter the hospital directory below.",
    catExplore: "Explore",
    hospTitle: "Verified Hospital Directory",
    hospSub: "Hospitals are being onboarded to Nexura OS Global from India's NABH & JCI-accredited network.",
    nabhBadge: "NABH",
    jciBadge: "JCI",
    from: "from",
    getEstimate: "Get Free Estimate",
    noHospitals: "No hospitals match this filter yet. Try another procedure category.",
    costTitle: "Transparent Cost Comparison",
    costSub: "All prices in USD. India column includes surgeon fees, hospital stay, anaesthesia, and standard post-operative care.",
    costProcedure: "Procedure",
    costIndia: "India (Nexura)",
    costUsa: "USA",
    costUk: "UK",
    costUae: "UAE",
    saveBadge: "Save up to 90%",
    howTitle: "How It Works",
    howSub: "From first inquiry to landing in India for treatment — four calm, well-orchestrated steps.",
    step1Title: "Submit Your Inquiry",
    step1Desc: "Free, no-obligation. Share your condition, medical records, and procedure interest.",
    step2Title: "Receive Cost Estimate",
    step2Desc: "Our coordinators prepare a transparent USD estimate with hospital options — targeted within 24 hours of your inquiry.",
    step3Title: "Pre-Travel Video Consultation",
    step3Desc: "Our coordinator helps arrange a video consultation with your treating doctor before you travel, so you can ask every question. (Service being onboarded.)",
    step4Title: "Arrive for Treatment",
    step4Desc: "Our coordinator helps arrange medical visa support, airport pickup, accommodation, and translators with partner services as they come onboard.",
    step1Badge: "Free",
    step2Badge: "Coordinator",
    step3Badge: "Being onboarded",
    step4Badge: "Coordinator help",
    storiesTitle: "Patient Stories",
    storiesSub: "Representative stories illustrating the international patient journey via Nexura OS Global — illustrative, not verified testimonials.",
    verified: "Representative patient story (illustrative)",
    footerAbout: "Nexura OS Global is the international patient desk for India's NABH & JCI accredited hospital network.",
    footerQuick: "Quick Links",
    footerContact: "International Desk",
    footerCompliance: "Compliance & Trust",
    rights: "All rights reserved.",
  },
};



/* ============================================================
   STAR RATING
   ============================================================ */
function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= Math.round(rating) ? "fill-[#F59E0B] text-[#F59E0B]" : "fill-slate-200 text-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export function GlobalPage() {
  const t = I18N.en;

  // search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // data state — initialise with fallback so SSR renders content immediately
  const [hospitals, setHospitals] = useState<Hospital[]>(FALLBACK_HOSPITALS);
  // true until the API confirms live hospital rows (fallback cards are demo data)
  const [isDemoDirectory, setIsDemoDirectory] = useState(true);
  const [costRows, setCostRows] = useState<CostRow[]>(FALLBACK_COST_ROWS);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(FALLBACK_TESTIMONIALS);

  // modal state
  const [modal, setModal] = useState<InquiryModalState>({ open: false, hospital: null });
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  // mobile nav
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // fetch on mount — silently upgrade to API data when available
  useEffect(() => {
    let cancelled = false;
    fetch("/api/global?action=hospitals")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.hospitals) && data.hospitals.length > 0) {
          setHospitals(data.hospitals);
          setIsDemoDirectory(false);
        } else {
          setIsDemoDirectory(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/global?action=cost_comparison")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.comparison) && data.comparison.length > 0) {
          setCostRows(data.comparison);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/global?action=testimonials")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.testimonials) && data.testimonials.length > 0) {
          setTestimonials(data.testimonials);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // filter hospitals by category & search
  const filteredHospitals = useMemo(() => {
    if (!hospitals) return [];
    return hospitals.filter((h) => {
      // category filter
      if (activeCategory !== "all") {
        const procs = h.tourismProcedures || [];
        const matchesCat = procs.some(
          (p) => p.category === activeCategory || p.name.toLowerCase().includes(activeCategory)
        );
        if (!matchesCat) return false;
      }
      // search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const haystack = [
          h.name,
          h.city || "",
          h.state || "",
          ...(h.tourismProcedures || []).map((p) => p.name),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [hospitals, activeCategory, searchQuery]);

  const handleSearch = useCallback(() => {
    const el = document.getElementById("hospitals");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const openInquiry = useCallback((hospital: Hospital, procedure?: string) => {
    setSubmitState("idle");
    setSubmitMessage("");
    setModal({ open: true, hospital, procedure });
  }, []);

  const closeInquiry = useCallback(() => {
    setModal({ open: false, hospital: null });
  }, []);

  const handleInquirySubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const hospital = modal.hospital;
      if (!hospital) return;
      const formData = new FormData(e.currentTarget);
      const payload = {
        action: "submit_inquiry",
        hospitalId: hospital.id,
        name: String(formData.get("name") || ""),
        email: String(formData.get("email") || ""),
        phone: String(formData.get("phone") || ""),
        country: String(formData.get("country") || ""),
        countryCode: String(formData.get("countryCode") || ""),
        procedure: String(formData.get("procedure") || ""),
        condition: String(formData.get("condition") || ""),
      };
      setSubmitState("submitting");
      try {
        const res = await fetch("/api/global", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setSubmitState("success");
          setSubmitMessage(
            data.message ||
              `Thank you ${payload.name}! Your inquiry has been submitted to ${hospital.name}.`
          );
        } else {
          setSubmitState("error");
          setSubmitMessage(
            data.error === "hospital_not_found"
              ? "This hospital is no longer available. Please refresh and try another."
              : "Something went wrong. Please try again or contact us on WhatsApp."
          );
        }
      } catch {
        setSubmitState("error");
        setSubmitMessage("Network error. Please try again or contact us on WhatsApp.");
      }
    },
    [modal.hospital]
  );

  return (
    <div className="relative min-h-screen bg-white font-sans text-slate-900 antialiased">
      {/* ============== TOP NAV ============== */}
      <TopNav
        t={t}
        onCta={() => openInquiry(hospitals[0])}
        mobileNavOpen={mobileNavOpen}
        setMobileNavOpen={setMobileNavOpen}
      />

      {/* ============== HERO ============== */}
      <Hero
        t={t}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCountry={selectedCountry}
        setSelectedCountry={setSelectedCountry}
        onSearch={handleSearch}
      />

      {/* ============== PROCEDURE CATEGORIES ============== */}
      <ProcedureGrid
        t={t}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
      />

      {/* ============== HOSPITAL DIRECTORY ============== */}
      <HospitalDirectory
        t={t}
        hospitals={filteredHospitals}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        onGetEstimate={openInquiry}
        isDemoDirectory={isDemoDirectory}
      />

      {/* ============== COST COMPARISON ============== */}
      <CostComparison t={t} rows={costRows} />

      {/* ============== COST SAVINGS CALCULATOR ============== */}
      <CostSavingsCalculator />

      {/* ============== HOW IT WORKS ============== */}
      <HowItWorks t={t} />

      {/* ============== TESTIMONIALS ============== */}
      <Testimonials t={t} testimonials={testimonials} />

      {/* ============== FINAL CTA ============== */}
      <FinalCTA t={t} onCta={() => openInquiry(hospitals[0])} />

      {/* ============== FOOTER ============== */}
      <GlobalFooter t={t} />

      {/* ============== WHATSAPP FLOATING ============== */}
      <WhatsAppButton />

      {/* ============== INQUIRY MODAL ============== */}
      <AnimatePresence>
        {modal.open && modal.hospital && (
          <InquiryModal
            t={t}
            hospital={modal.hospital}
            procedure={modal.procedure}
            submitState={submitState}
            submitMessage={submitMessage}
            onClose={closeInquiry}
            onSubmit={handleInquirySubmit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   TOP NAV
   ============================================================ */
function TopNav({
  t,
  onCta,
  mobileNavOpen,
  setMobileNavOpen,
}: {
  t: typeof I18N["en"];
  onCta: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (b: boolean) => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "#hospitals", label: t.navHospitals },
    { href: "#cost", label: t.navCost },
    { href: "#how", label: t.navHow },
    { href: "#stories", label: t.navStories },
    { href: "#contact", label: t.navContact },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled ? "bg-white/85 backdrop-blur-xl shadow-[0_4px_24px_-12px_rgba(15,23,42,0.18)] border-b border-slate-200/70" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="#top" className="flex items-center gap-2.5">
          <span
            className="grid h-9 w-9 place-items-center rounded-xl shadow-md"
            style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_2})` }}
          >
            <HeartPulse className="h-4.5 w-4.5 text-[#F59E0B]" strokeWidth={2.5} />
          </span>
          <div className="leading-none">
            <p className="font-display text-base font-bold tracking-tight text-slate-900">
              Nexura<span style={{ color: GOLD }}> OS</span>
            </p>
            <p className="text-[0.55rem] uppercase tracking-[0.22em] text-slate-500">Global</p>
          </div>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 lg:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Right: CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={onCta}
            className="hidden rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.03] sm:block"
            style={{ background: GOLD }}
          >
            {t.navCta}
          </button>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 lg:hidden"
            aria-label="Open menu"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-slate-200 bg-white lg:hidden"
          >
            <nav className="mx-auto flex max-w-7xl flex-col px-4 py-3 sm:px-6">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="border-b border-slate-100 py-3 text-sm font-medium text-slate-700 last:border-0"
                >
                  {l.label}
                </a>
              ))}
              <button
                onClick={() => {
                  setMobileNavOpen(false);
                  onCta();
                }}
                className="mt-3 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: GOLD }}
              >
                {t.navCta}
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ============================================================
   HERO
   ============================================================ */
function Hero({
  t,
  searchQuery,
  setSearchQuery,
  selectedCountry,
  setSelectedCountry,
  onSearch,
}: {
  t: typeof I18N["en"];
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  selectedCountry: string;
  setSelectedCountry: (s: string) => void;
  onSearch: () => void;
}) {
  return (
    <section
      id="top"
      className="relative overflow-hidden pt-28 pb-20 sm:pt-32 sm:pb-24 lg:pt-40 lg:pb-28"
      style={{ background: `linear-gradient(180deg, ${NAVY} 0%, ${NAVY_2} 100%)` }}
    >
      {/* mesh / aurora overlay */}
      <div className="pointer-events-none absolute inset-0 mesh-bg-dark opacity-90" aria-hidden />
      {/* gold glow accents */}
      <div
        className="pointer-events-none absolute -top-32 right-1/4 h-96 w-96 rounded-full opacity-25 blur-3xl"
        style={{ background: `radial-gradient(circle, ${GOLD}, transparent 70%)` }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full opacity-20 blur-3xl"
        style={{ background: `radial-gradient(circle, #38BDF8, transparent 70%)` }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-4 py-1.5 text-xs font-medium text-[#FBBF24]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F59E0B] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F59E0B]" />
            </span>
            {t.heroBadge}
          </span>
        </motion.div>

        {/* headline */}
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08 }}
          className="mx-auto mt-6 max-w-4xl text-center font-display text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
        >
          {t.heroTitle1}{" "}
          <span className="relative inline-block">
            <span style={{ color: GOLD }}>{t.heroTitle2}</span>
            <svg
              className="absolute -bottom-2 left-0 w-full text-[#F59E0B]/60"
              viewBox="0 0 300 12"
              fill="none"
              aria-hidden
            >
              <motion.path
                d="M2 8 Q 75 2 150 6 T 298 5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, delay: 0.6, ease: "easeInOut" }}
              />
            </svg>
          </span>
        </motion.h1>

        {/* subhead */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.16 }}
          className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-slate-300 sm:text-lg"
        >
          {t.heroSub}
        </motion.p>

        {/* search bar */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.24 }}
          className="mx-auto mt-10 max-w-3xl"
        >
          <div className="glass-soft flex flex-col gap-2 rounded-2xl p-2 shadow-2xl sm:flex-row sm:items-center sm:gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
                placeholder={t.searchPlaceholder}
                className="w-full rounded-xl border-0 bg-transparent py-3 pl-11 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/40"
              />
            </div>
            <div className="relative sm:w-56">
              <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-9 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/40"
                aria-label={t.countryLabel}
              >
                <option value="">{t.countryPlaceholder}</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            <button
              onClick={onSearch}
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
              style={{ background: GOLD }}
            >
              {t.searchBtn}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </button>
          </div>

          {/* quick suggestion chips */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-slate-400">Popular:</span>
            {["CABG", "IVF", "Knee Replacement", "Dental Implants"].map((q) => (
              <button
                key={q}
                onClick={() => setSearchQuery(q)}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-200 transition-colors hover:border-[#F59E0B]/50 hover:text-[#FBBF24]"
              >
                {q}
              </button>
            ))}
          </div>
        </motion.div>

        {/* stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.32 }}
          className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <HeroStat value="Accredited" label={t.stat1} />
          <HeroStat value="Transparent" label={t.stat2} />
          <HeroStat value="Dedicated" label={t.stat3} />
        </motion.div>
      </div>

      {/* bottom soft fade to white */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white" />
    </section>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="glass-soft rounded-2xl border border-white/10 p-5 text-center">
      <p className="font-display text-3xl font-bold text-white sm:text-4xl">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-slate-300">{label}</p>
    </div>
  );
}

/* ============================================================
   PROCEDURE CATEGORY GRID
   ============================================================ */
function ProcedureGrid({
  t,
  activeCategory,
  setActiveCategory,
}: {
  t: typeof I18N["en"];
  activeCategory: string;
  setActiveCategory: (c: string) => void;
}) {
  return (
    <section id="categories" className="relative py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Specialties" title={t.catTitle} sub={t.catSub} />

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {PROCEDURE_CATEGORIES.map((cat, i) => {
            const isActive = activeCategory === cat.id;
            return (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                whileHover={{ y: -4 }}
                onClick={() =>
                  setActiveCategory(isActive ? "all" : cat.id)
                }
                className={`group relative flex flex-col items-start overflow-hidden rounded-2xl border p-5 text-left transition-all ${
                  isActive
                    ? "border-[#F59E0B] bg-[#FFFBEB] shadow-lg"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                }`}
              >
                {/* gold glow on hover */}
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: `radial-gradient(circle, ${GOLD}, transparent 70%)` }}
                />
                <span
                  className="relative grid h-12 w-12 place-items-center rounded-xl transition-transform group-hover:scale-110"
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, ${GOLD}, #D97706)`
                      : `linear-gradient(135deg, ${NAVY}, ${NAVY_2})`,
                  }}
                >
                  <cat.icon className="h-5.5 w-5.5 text-white" strokeWidth={1.9} />
                </span>
                <h3 className="relative mt-4 font-display text-sm font-bold leading-tight text-slate-900">
                  {cat.name}
                </h3>
                <p className="relative mt-1 text-[0.7rem] text-slate-500">{cat.blurb}</p>
                <div className="relative mt-3 flex items-center gap-1 text-[0.7rem] font-semibold text-slate-400 transition-colors group-hover:text-[#D97706]">
                  {t.catExplore}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1 rtl:rotate-180" />
                </div>
                {isActive && (
                  <motion.span
                    layoutId="cat-active"
                    className="absolute inset-x-0 bottom-0 h-1"
                    style={{ background: GOLD }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   HOSPITAL DIRECTORY
   ============================================================ */
function HospitalDirectory({
  t,
  hospitals,
  activeCategory,
  setActiveCategory,
  onGetEstimate,
  isDemoDirectory,
}: {
  t: typeof I18N["en"];
  hospitals: Hospital[];
  activeCategory: string;
  setActiveCategory: (c: string) => void;
  onGetEstimate: (h: Hospital, p?: string) => void;
  isDemoDirectory: boolean;
}) {
  return (
    <section id="hospitals" className="relative bg-slate-50 py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Directory" title={t.hospTitle} sub={t.hospSub} dark />

        {/* demo-data note — shown until live hospital rows arrive from the API */}
        {isDemoDirectory && (
          <div className="mt-6 flex justify-center">
            <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#F59E0B]/30 bg-[#FFFBEB] px-4 py-1.5 text-xs font-medium text-[#92400E]">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              Demo directory — live hospitals appear here as partners are onboarded
            </p>
          </div>
        )}

        {/* active filter chip */}
        {activeCategory !== "all" && (
          <div className="mt-6 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F59E0B]/30 bg-[#FFFBEB] px-4 py-1.5 text-xs font-medium text-[#92400E]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
              {PROCEDURE_CATEGORIES.find((c) => c.id === activeCategory)?.name}
              <button
                onClick={() => setActiveCategory("all")}
                className="ml-1 rounded-full p-0.5 hover:bg-[#F59E0B]/20"
                aria-label="Clear filter"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* grid */}
        {hospitals.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-slate-500">{t.noHospitals}</p>
          </div>
        ) : (
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {hospitals.map((h, i) => (
              <HospitalCard key={h.id} hospital={h} t={t} onGetEstimate={onGetEstimate} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function HospitalCard({
  hospital,
  t,
  onGetEstimate,
  index,
}: {
  hospital: Hospital;
  t: typeof I18N["en"];
  onGetEstimate: (h: Hospital, p?: string) => void;
  index: number;
}) {
  const rating = hospital.tourismSetting?.rating ?? 4.5;
  const hasJCI = !!hospital.tourismSetting?.jciCertUrl;
  const hasNABH = !!hospital.tourismSetting?.nabhCertUrl || hospital.nabhAccredited;
  const top3 = (hospital.tourismProcedures || []).slice(0, 3);
  const cityLabel = hospital.city || hospital.district || hospital.state || "India";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.08 }}
      whileHover={{ y: -4 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-xl"
    >
      {/* gold accent top bar */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${GOLD}, #D97706)` }} />

      <div className="flex flex-1 flex-col p-6">
        {/* header: name + rating */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
              style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_2})` }}
            >
              <Stethoscope className="h-5 w-5 text-white" strokeWidth={1.9} />
            </span>
            <div>
              <h3 className="font-display text-base font-bold leading-tight text-slate-900">
                {hospital.name}
              </h3>
              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3 w-3" />
                {cityLabel}
                {hospital.country ? `, ${hospital.country}` : ""}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <Stars rating={rating} />
            <span className="mt-0.5 text-[0.65rem] font-medium text-slate-500">{rating.toFixed(1)}</span>
          </div>
        </div>

        {/* accreditation badges */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {hasNABH && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#F59E0B]/30 bg-[#FFFBEB] px-2.5 py-1 text-[0.65rem] font-bold text-[#92400E]">
              <ShieldCheck className="h-3 w-3" />
              {t.nabhBadge}
            </span>
          )}
          {hasJCI && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#F59E0B]/30 bg-[#FFFBEB] px-2.5 py-1 text-[0.65rem] font-bold text-[#92400E]">
              <BadgeCheck className="h-3 w-3" />
              {t.jciBadge}
            </span>
          )}
        </div>

        {/* top procedures */}
        <div className="mt-5 flex-1 space-y-2">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">
            Top Procedures
          </p>
          {top3.length === 0 ? (
            <p className="text-sm text-slate-400">—</p>
          ) : (
            top3.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
              >
                <span className="text-sm text-slate-700">{p.name}</span>
                <div className="text-right">
                  <span className="text-[0.6rem] uppercase text-slate-400">{t.from}</span>
                  <p className="font-display text-sm font-bold text-slate-900">
                    ${p.priceUSD.toLocaleString("en-US")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* CTA */}
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => onGetEstimate(hospital, top3[0]?.name)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg"
            style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_2})` }}
          >
            {t.getEstimate}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </button>
          <Link
            href="#hospitals"
            className="flex items-center justify-center gap-1.5 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all hover:scale-105"
            style={{ borderColor: `${GOLD}40`, color: NAVY }}
          >
            View
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/* ============================================================
   COST COMPARISON
   ============================================================ */
function CostComparison({ t, rows }: { t: typeof I18N["en"]; rows: CostRow[] }) {
  const maxIndia = rows.length ? Math.max(...rows.map((r) => r.india)) : 1;

  return (
    <section id="cost" className="relative bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Pricing" title={t.costTitle} sub={t.costSub} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-12 overflow-hidden rounded-2xl border border-slate-200 shadow-sm"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr
                  className="text-white"
                  style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_2})` }}
                >
                  <th className="px-4 py-4 text-left font-semibold">{t.costProcedure}</th>
                  <th className="relative px-4 py-4 text-center font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold text-white"
                        style={{ background: GREEN_IND }}
                      >
                        {t.saveBadge}
                      </span>
                      {t.costIndia}
                    </div>
                  </th>
                  <th className="px-4 py-4 text-center font-medium text-slate-300">{t.costUsa}</th>
                  <th className="px-4 py-4 text-center font-medium text-slate-300">{t.costUk}</th>
                  <th className="px-4 py-4 text-center font-medium text-slate-300">{t.costUae}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const savingsPct = Math.round(
                    (1 - row.india / Math.max(row.usa, 1)) * 100
                  );
                  return (
                    <tr
                      key={row.procedure}
                      className={`border-t border-slate-100 ${
                        i % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                      }`}
                    >
                      <td className="px-4 py-3.5 font-medium text-slate-900">{row.procedure}</td>
                      <td className="relative bg-[#F0FDF4] px-4 py-3.5 text-center">
                        <div className="relative">
                          <span className="font-display font-bold text-[#15803D]">
                            ${row.india.toLocaleString("en-US")}
                          </span>
                          {savingsPct > 50 && (
                            <span className="ml-1 rounded-full bg-[#DCFCE7] px-1.5 py-0.5 text-[0.6rem] font-bold text-[#15803D]">
                              -{savingsPct}%
                            </span>
                          )}
                        </div>
                        {/* subtle bar */}
                        <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-[#DCFCE7]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(row.india / maxIndia) * 100}%`,
                              background: GREEN_IND,
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-500">
                        ${row.usa.toLocaleString("en-US")}
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-500">
                        ${row.uk.toLocaleString("en-US")}
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-500">
                        ${row.uae.toLocaleString("en-US")}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      Cost data unavailable.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        <p className="mt-4 text-center text-xs text-slate-400">
          * Indicative prices. Final estimate shared within 24h of inquiry based on case complexity.
        </p>
      </div>
    </section>
  );
}

/* ============================================================
   HOW IT WORKS
   ============================================================ */
function HowItWorks({ t }: { t: typeof I18N["en"] }) {
  const steps = [
    {
      icon: Send,
      n: "1",
      title: t.step1Title,
      desc: t.step1Desc,
      badge: t.step1Badge,
    },
    {
      icon: FileText,
      n: "2",
      title: t.step2Title,
      desc: t.step2Desc,
      badge: t.step2Badge,
    },
    {
      icon: Video,
      n: "3",
      title: t.step3Title,
      desc: t.step3Desc,
      badge: t.step3Badge,
    },
    {
      icon: Plane,
      n: "4",
      title: t.step4Title,
      desc: t.step4Desc,
      badge: t.step4Badge,
    },
  ];

  return (
    <section
      id="how"
      className="relative overflow-hidden py-20 lg:py-24"
      style={{ background: `linear-gradient(180deg, ${NAVY} 0%, ${NAVY_2} 100%)` }}
    >
      {/* gold glow */}
      <div
        className="pointer-events-none absolute -top-32 right-1/3 h-80 w-80 rounded-full opacity-15 blur-3xl"
        style={{ background: `radial-gradient(circle, ${GOLD}, transparent 70%)` }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-[#FBBF24]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
            {t.howTitle}
          </span>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t.howSub}
          </h2>
        </div>

        {/* horizontal timeline */}
        <div className="relative mt-14">
          {/* connecting line (desktop) */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-8 hidden h-0.5 lg:block"
            style={{
              background: `linear-gradient(90deg, transparent, rgba(245,158,11,0.4), rgba(245,158,11,0.4), transparent)`,
            }}
            aria-hidden
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative"
              >
                {/* numbered circle */}
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg">
                  <s.icon className="h-6 w-6" style={{ color: NAVY }} strokeWidth={1.9} />
                  <span
                    className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full text-[0.7rem] font-bold text-white shadow-md"
                    style={{ background: GOLD }}
                  >
                    {s.n}
                  </span>
                </div>
                <div className="mt-4 text-center">
                  <span className="inline-block rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2.5 py-0.5 text-[0.65rem] font-bold text-[#FBBF24]">
                    {s.badge}
                  </span>
                  <h3 className="mt-3 font-display text-base font-bold text-white">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   TESTIMONIALS
   ============================================================ */
function Testimonials({
  t,
  testimonials,
}: {
  t: typeof I18N["en"];
  testimonials: Testimonial[];
}) {
  return (
    <section id="stories" className="relative bg-slate-50 py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Stories" title={t.storiesTitle} sub={t.storiesSub} dark />

        {testimonials.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-slate-500">Representative patient stories will appear here.</p>
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.slice(0, 6).map((tm, i) => (
              <motion.div
                key={tm.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                whileHover={{ y: -4 }}
                className="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg"
              >
                <Quote className="absolute right-5 top-5 h-10 w-10 text-slate-100" />

                <div className="flex items-center justify-between">
                  <Stars rating={tm.rating} />
                  {tm.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[0.6rem] font-bold text-[#15803D]">
                      <CheckCircle2 className="h-3 w-3" />
                      {t.verified}
                    </span>
                  )}
                </div>

                <p className="relative mt-4 flex-1 text-sm leading-relaxed text-slate-700">
                  &ldquo;{tm.testimonial}&rdquo;
                </p>

                <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <span
                    className="grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_2})` }}
                  >
                    {tm.patientName
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{tm.patientName}</p>
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <span>
                        {COUNTRY_FLAGS[tm.patientCountry] || "🏳️"} {tm.patientCountry}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span>{tm.procedure}</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ============================================================
   FINAL CTA
   ============================================================ */
function FinalCTA({ t, onCta }: { t: typeof I18N["en"]; onCta: () => void }) {
  return (
    <section
      className="relative overflow-hidden py-16"
      style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_2})` }}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-30 blur-3xl"
        style={{ background: `radial-gradient(circle, ${GOLD}, transparent 70%)` }}
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Ready to begin your medical journey to India?
        </h2>
        <p className="max-w-xl text-base text-slate-300">
          Get a free, no-obligation cost estimate within 24 hours. Our international patient
          coordinators speak English, Arabic, Hindi, and Russian.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <button
            onClick={onCta}
            className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition-transform hover:scale-[1.03]"
            style={{ background: GOLD }}
          >
            {t.navCta}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </button>
          <a
            href="https://wa.me/919820012345?text=Hello%2C%20I%27d%20like%20to%20know%20more%20about%20medical%20treatment%20in%20India%20via%20Nexura%20OS"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
          >
            <MessageCircle className="h-4 w-4 text-[#25D366]" />
            WhatsApp Us
          </a>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FOOTER
   ============================================================ */
function GlobalFooter({ t }: { t: typeof I18N["en"] }) {
  return (
    <footer id="contact" className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* about */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <span
                className="grid h-9 w-9 place-items-center rounded-xl"
                style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_2})` }}
              >
                <HeartPulse className="h-4.5 w-4.5 text-[#F59E0B]" strokeWidth={2.5} />
              </span>
              <div className="leading-none">
                <p className="font-display text-base font-bold text-slate-900">
                  Nexura<span style={{ color: GOLD }}> OS</span>
                </p>
                <p className="text-[0.55rem] uppercase tracking-[0.22em] text-slate-500">Global</p>
              </div>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">{t.footerAbout}</p>
            <div className="mt-5 flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full border border-[#F59E0B]/30 bg-[#FFFBEB] px-2.5 py-1 text-[0.6rem] font-bold text-[#92400E]"
              >
                <ShieldCheck className="h-3 w-3" />
                NABH
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#F59E0B]/30 bg-[#FFFBEB] px-2.5 py-1 text-[0.6rem] font-bold text-[#92400E]">
                <BadgeCheck className="h-3 w-3" />
                JCI
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.6rem] font-bold text-slate-600">
                <Lock className="h-3 w-3" />
                HIPAA
              </span>
            </div>
          </div>

          {/* quick links */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900">{t.footerQuick}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
              <li><a href="#hospitals" className="transition-colors hover:text-slate-900">{t.navHospitals}</a></li>
              <li><a href="#cost" className="transition-colors hover:text-slate-900">{t.navCost}</a></li>
              <li><a href="#how" className="transition-colors hover:text-slate-900">{t.navHow}</a></li>
              <li><a href="#stories" className="transition-colors hover:text-slate-900">{t.navStories}</a></li>
            </ul>
          </div>

          {/* contact */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900">{t.footerContact}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <a href="tel:+919820012345" className="hover:text-slate-900">+91 98200 12345</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <a href="mailto:global@nexura.os" className="hover:text-slate-900">global@nexura.os</a>
              </li>
              <li className="flex items-center gap-2">
                <Globe2 className="h-3.5 w-3.5 text-slate-400" />
                <span>EN · AR · HI · RU</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>24×7 International Desk</span>
              </li>
            </ul>
          </div>

          {/* compliance */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900">{t.footerCompliance}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#15803D]" /> NABH Accredited Network</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#15803D]" /> JCI Certified Partners</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#15803D]" /> HIPAA & GDPR Compliant</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#15803D]" /> ABDM-ready — alignment in progress</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#15803D]" /> Medical Visa Support</li>
            </ul>
          </div>
        </div>

        {/* divider */}
        <div className="my-8 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        {/* bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Nexura OS Global. {t.rights}
          </p>
          <p className="text-[0.65rem] text-slate-400">
            Built with care for international patients · Designed in India
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   WHATSAPP FLOATING BUTTON
   ============================================================ */
function WhatsAppButton() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const href =
    "https://wa.me/919820012345?text=" +
    encodeURIComponent(
      "Hello, I'd like to know more about medical treatment in India via Nexura OS"
    );

  return (
    <AnimatePresence>
      {show && (
        <motion.a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          whileHover={{ y: -3, scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.6)] sm:bottom-7 sm:right-7"
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden text-sm font-semibold sm:block">Chat with us</span>
          {/* pulse ring */}
          <span className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-[#25D366] opacity-40 anim-breathe" />
        </motion.a>
      )}
    </AnimatePresence>
  );
}

/* ============================================================
   INQUIRY MODAL
   ============================================================ */
function InquiryModal({
  t,
  hospital,
  procedure,
  submitState,
  submitMessage,
  onClose,
  onSubmit,
}: {
  t: typeof I18N["en"];
  hospital: Hospital;
  procedure?: string;
  submitState: "idle" | "submitting" | "success" | "error";
  submitMessage: string;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  // lock scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* overlay */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* modal panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        {/* header */}
        <div
          className="relative px-6 py-5 text-white"
          style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_2})` }}
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <span
              className="grid h-11 w-11 place-items-center rounded-xl"
              style={{ background: GOLD }}
            >
              <Stethoscope className="h-5 w-5 text-white" strokeWidth={1.9} />
            </span>
            <div>
              <p className="text-[0.65rem] uppercase tracking-wider text-[#FBBF24]">Free Estimate Request</p>
              <h2 className="font-display text-lg font-bold leading-tight">{hospital.name}</h2>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-300">
            Submit your details — a coordinator will respond within 24 hours with a transparent
            USD cost estimate.
          </p>
        </div>

        {/* body */}
        <div className="p-6">
          {submitState === "success" ? (
            <SuccessState message={submitMessage} onClose={onClose} />
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              {/* name */}
              <Field label="Full Name" required>
                <input
                  name="name"
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#F59E0B] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20"
                  placeholder="e.g. Ahmed Al-Rashid"
                />
              </Field>

              {/* email */}
              <Field label="Email Address" required>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#F59E0B] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20"
                  placeholder="you@example.com"
                />
              </Field>

              {/* phone with country code */}
              <Field label="WhatsApp Number" required>
                <div className="flex gap-2">
                  <select
                    name="countryCode"
                    defaultValue="+971"
                    className="w-28 shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-sm text-slate-900 focus:border-[#F59E0B] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.dial}>
                        {c.flag} {c.dial}
                      </option>
                    ))}
                  </select>
                  <input
                    name="phone"
                    type="tel"
                    required
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#F59E0B] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20"
                    placeholder="50 123 4567"
                  />
                </div>
              </Field>

              {/* country of residence */}
              <Field label="Country of Residence" required>
                <select
                  name="country"
                  required
                  defaultValue=""
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#F59E0B] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20"
                >
                  <option value="" disabled>
                    Select your country
                  </option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              {/* procedure of interest */}
              <Field label="Procedure of Interest" required>
                <select
                  name="procedure"
                  required
                  defaultValue={procedure || ""}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#F59E0B] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20"
                >
                  <option value="" disabled>
                    Select a procedure
                  </option>
                  {(hospital.tourismProcedures || []).map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} — from ${p.priceUSD.toLocaleString("en-US")}
                    </option>
                  ))}
                  <option value="Other">Other / Not sure yet</option>
                </select>
              </Field>

              {/* condition */}
              <Field label="Condition Description" required>
                <textarea
                  name="condition"
                  required
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#F59E0B] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20"
                  placeholder="Briefly describe your medical condition, diagnosis, current treatment, and any prior surgeries."
                />
              </Field>

              {/* privacy note */}
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>
                  Your information is encrypted and shared only with the hospital you select.
                  Nexura OS is HIPAA & GDPR compliant.
                </span>
              </div>

              {/* error */}
              {submitState === "error" && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {submitMessage}
                </div>
              )}

              {/* submit */}
              <button
                type="submit"
                disabled={submitState === "submitting"}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
                style={{ background: `linear-gradient(135deg, ${GOLD}, #D97706)` }}
              >
                {submitState === "submitting" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    Submit Inquiry
                    <Send className="h-4 w-4 rtl:scale-x-[-1]" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label} {required && <span style={{ color: GOLD }}>*</span>}
      </span>
      {children}
    </label>
  );
}

function SuccessState({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center py-8 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1, type: "spring" }}
        className="grid h-16 w-16 place-items-center rounded-full bg-[#ECFDF5]"
      >
        <CheckCircle2 className="h-9 w-9 text-[#15803D]" />
      </motion.div>
      <h3 className="mt-4 font-display text-xl font-bold text-slate-900">Inquiry Submitted</h3>
      <p className="mt-2 max-w-md text-sm text-slate-600">{message}</p>
      <div className="mt-5 flex items-center gap-3 rounded-lg bg-[#FFFBEB] px-4 py-3 text-xs text-[#92400E]">
        <Clock className="h-4 w-4" />
        Next: A coordinator will WhatsApp you within 24 hours with a cost estimate.
      </div>
      <button
        onClick={onClose}
        className="mt-6 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-md"
        style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_2})` }}
      >
        Done
      </button>
    </motion.div>
  );
}

/* ============================================================
   SHARED — Section Heading
   ============================================================ */
function SectionHeading({
  eyebrow,
  title,
  sub,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  dark?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-2xl text-center"
    >
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
          dark
            ? "border-slate-200 bg-white text-slate-600"
            : "border-slate-200 bg-white text-slate-600"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: GOLD }} />
        {eyebrow}
      </span>
      <h2
        className={`mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl ${
          dark ? "text-slate-900" : "text-slate-900"
        }`}
      >
        {title}
      </h2>
      <p className="mt-3 text-base text-slate-500">{sub}</p>
    </motion.div>
  );
}

/* ============================================================
   COST SAVINGS CALCULATOR
   ============================================================ */
const SAVINGS_DATA: { procedure: string; india: number; usa: number; uk: number; uae: number }[] = [
  { procedure: "Coronary Bypass Surgery", india: 4500, usa: 130000, uk: 45000, uae: 25000 },
  { procedure: "Hip Replacement", india: 5800, usa: 40000, uk: 18000, uae: 15000 },
  { procedure: "Knee Replacement", india: 5200, usa: 35000, uk: 16000, uae: 14000 },
  { procedure: "IVF Treatment", india: 2200, usa: 15000, uk: 8000, uae: 6000 },
  { procedure: "Dental Implants (per tooth)", india: 800, usa: 5000, uk: 3000, uae: 2000 },
  { procedure: "Brain Tumor Surgery", india: 7500, usa: 150000, uk: 60000, uae: 35000 },
  { procedure: "Kidney Transplant", india: 14000, usa: 400000, uk: 100000, uae: 60000 },
  { procedure: "Liver Transplant", india: 35000, usa: 575000, uk: 200000, uae: 120000 },
  { procedure: "Gastric Bypass Surgery", india: 4500, usa: 25000, uk: 12000, uae: 9000 },
  { procedure: "Breast Cancer Surgery", india: 3800, usa: 20000, uk: 10000, uae: 8000 },
];

// Illustrative private-treatment price ratios vs USA for countries without a
// dedicated comparison column (public, rough estimates — not quotations).
const COUNTRY_COST_FACTOR: Record<string, number> = {
  Canada: 0.6,
  Australia: 0.55,
  Germany: 0.65,
  France: 0.5,
};

function CostSavingsCalculator() {
  const [country, setCountry] = useState("USA");
  const [procedure, setProcedure] = useState(SAVINGS_DATA[0].procedure);
  // Calculate on render (derived state, no effect needed)
  const data = SAVINGS_DATA.find(d => d.procedure === procedure);
  const foreignCost =
    country === "USA" ? (data?.usa || 0)
    : country === "UK" ? (data?.uk || 0)
    : country === "UAE" ? (data?.uae || 0)
    : Math.round((data?.usa || 0) * (COUNTRY_COST_FACTOR[country] ?? 1));
  const indiaCost = data?.india || 0;
  const savings = foreignCost - indiaCost;
  const pct = foreignCost > 0 ? Math.round((savings / foreignCost) * 100) : 0;
  const result = { india: indiaCost, foreign: foreignCost, savings, pct };

  const COUNTRIES = ["USA", "UK", "UAE", "Canada", "Australia", "Germany", "France"];

  return (
    <section className="relative bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Calculator" title="Calculate Your Savings" sub="See how much you save by choosing India for your treatment — illustrative estimates, not quotations" />
        <div className="mt-12 mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">I am from</label>
              <select value={country} onChange={(e) => setCountry(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-amber-400">
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Procedure</label>
              <select value={procedure} onChange={(e) => setProcedure(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-amber-400">
                {SAVINGS_DATA.map(d => <option key={d.procedure} value={d.procedure}>{d.procedure}</option>)}
              </select>
            </div>
          </div>

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 grid grid-cols-3 gap-4 text-center"
            >
              <div className="rounded-xl bg-red-50 p-4">
                <p className="text-[0.6rem] font-semibold uppercase text-red-500">{country} Cost</p>
                <p className="mt-1 font-display text-xl font-bold text-red-600">${result.foreign.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-[0.6rem] font-semibold uppercase text-green-600">India Cost</p>
                <p className="mt-1 font-display text-xl font-bold text-green-600">${result.india.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4 ring-2 ring-amber-400">
                <p className="text-[0.6rem] font-semibold uppercase text-amber-600">You Save</p>
                <p className="mt-1 font-display text-xl font-bold text-amber-600">${result.savings.toLocaleString()}</p>
                <p className="text-[0.55rem] font-bold text-amber-500">{result.pct}% OFF</p>
              </div>
            </motion.div>
          )}

          <p className="mt-4 text-center text-xs text-slate-400">
            * Illustrative estimate. Countries without a dedicated comparison column use a rough
            price ratio vs US private treatment. Final USD estimate is shared after your inquiry.
          </p>
        </div>
      </div>
    </section>
  );
}
