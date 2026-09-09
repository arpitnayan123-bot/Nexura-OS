import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE = "portal_session";

/** Shared — fetch PortalUser from session cookie. */
async function getUser() {
  const store = await cookies();
  const userId = store.get(SESSION_COOKIE)?.value;
  if (!userId) return null;
  return db.portalUser.findUnique({
    where: { id: userId },
    select: {
      id: true,
      phone: true,
      fullName: true,
      email: true,
      dob: true,
      gender: true,
      bloodGroup: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
      abhaId: true,
      profilePhoto: true,
      hospitalPatientUhid: true,
      familyHeadId: true,
      relationToHead: true,
      isOnboarded: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
}

interface TimelineEvent {
  id: string;
  type: "appointment" | "admission" | "vital" | "bill" | "insurance" | "lab" | "blood_booking";
  title: string;
  subtitle: string;
  date: string;
  meta?: Record<string, unknown>;
}

/**
 * GET /api/portal/dashboard
 *
 * Aggregates EVERYTHING for the logged-in user via Promise.allSettled:
 *   - user
 *   - hospitalPatient (linked via UHID, includes appointments, admissions, vitals, bills, insurance, orders)
 *   - stats (totals)
 *   - appointments, admissions, labReports, bills, insurance, vitals, bloodBookings, familyMembers
 *   - timeline (merged + sorted, capped at 50)
 *   - aiInsights (rule-based)
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // fetch all data in parallel; tolerate individual failures
    const [hpRes, bbRes, fmRes] = await Promise.allSettled([
      user.hospitalPatientUhid
        ? db.hospitalPatient.findFirst({
            where: { uhid: user.hospitalPatientUhid },
            include: {
              appointments: { include: { doctor: true }, orderBy: { date: "desc" }, take: 30 },
              admissions: { include: { ward: true, bed: true, admittingDoctor: true }, orderBy: { admissionDate: "desc" }, take: 10 },
              vitals: { orderBy: { recordedAt: "desc" }, take: 20 },
              bills: { orderBy: { billDate: "desc" }, take: 20 },
              insuranceClaims: { orderBy: { createdAt: "desc" }, take: 10 },
              orders: { include: { labResults: true }, orderBy: { createdAt: "desc" }, take: 20 },
            },
          })
        : Promise.resolve(null),
      db.bloodBooking.findMany({
        where: { userId: user.id },
        orderBy: { scheduledDate: "desc" },
      }),
      db.portalUser.findMany({
        where: {
          OR: [{ familyHeadId: user.id }, { id: user.familyHeadId ?? "" }],
        },
        select: {
          id: true,
          fullName: true,
          phone: true,
          dob: true,
          gender: true,
          bloodGroup: true,
          relationToHead: true,
          familyHeadId: true,
          abhaId: true,
        },
      }),
    ]);

    const hospitalPatient = hpRes.status === "fulfilled" ? hpRes.value : null;
    const bloodBookings = bbRes.status === "fulfilled" ? bbRes.value : [];
    const familyMembers = fmRes.status === "fulfilled" ? fmRes.value : [];

    // ---- Flatten hospital sub-collections ----
    const appointments = hospitalPatient?.appointments ?? [];
    const admissions = hospitalPatient?.admissions ?? [];
    const vitals = hospitalPatient?.vitals ?? [];
    const bills = hospitalPatient?.bills ?? [];
    const insurance = hospitalPatient?.insuranceClaims ?? [];
    const orders = hospitalPatient?.orders ?? [];
    const labReports = orders.flatMap((o) =>
      (o.labResults ?? []).map((lr) => ({
        ...lr,
        order: { id: o.id, orderType: o.orderType, orderDetails: o.orderDetails, priority: o.priority, status: o.status },
      }))
    );

    // ---- Stats ----
    const now = new Date();
    const upcomingAppointments = appointments.filter((a) => new Date(a.date) >= now && a.status === "scheduled").length;
    const pendingLabReports = orders.filter((o) => o.status === "ordered" || o.status === "in_progress").length;
    const activeInsurance = insurance.filter((i) => i.preAuthStatus === "approved" || i.preAuthStatus === "submitted").length;
    const pendingBloodReports = bloodBookings.filter((b) => b.status !== "report_ready" && b.status !== "cancelled").length;

    const stats = {
      totalAppointments: appointments.length,
      totalLabReports: labReports.length,
      totalBills: bills.length,
      totalBloodTests: bloodBookings.length,
      upcomingAppointments,
      pendingLabReports,
      pendingBloodReports,
      activeInsurance,
      familyMembers: familyMembers.length + 1, // +1 for self
    };

    // ---- Timeline (merge + sort) ----
    const timeline: TimelineEvent[] = [];
    for (const a of appointments) {
      timeline.push({
        id: a.id,
        type: "appointment",
        title: `Appointment · ${a.appointmentType.toUpperCase()}`,
        subtitle: `Dr. ${a.doctor?.name ?? "—"}`,
        date: a.date.toISOString(),
        meta: { status: a.status, token: a.tokenNumber, chiefComplaint: a.chiefComplaint },
      });
    }
    for (const ad of admissions) {
      timeline.push({
        id: ad.id,
        type: "admission",
        title: `Admission · ${ad.admissionType}`,
        subtitle: ad.admissionDiagnosis ?? ad.ward?.name ?? "Hospital admission",
        date: ad.admissionDate.toISOString(),
        meta: { status: ad.dischargeStatus ?? "active", ward: ad.ward?.wardType, bed: ad.bed?.bedNumber },
      });
    }
    for (const v of vitals) {
      timeline.push({
        id: v.id,
        type: "vital",
        title: "Vitals Recorded",
        subtitle: `BP ${v.bpSystolic ?? "—"}/${v.bpDiastolic ?? "—"} · SpO₂ ${v.spo2 ?? "—"}% · NEWS2 ${v.news2Score ?? "—"}`,
        date: v.recordedAt.toISOString(),
        meta: { pulse: v.pulseRate, temp: v.temperatureC, glucose: v.bloodGlucose },
      });
    }
    for (const b of bills) {
      timeline.push({
        id: b.id,
        type: "bill",
        title: `Bill · ₹${b.totalPayable.toLocaleString("en-IN")}`,
        subtitle: `Payment: ${b.paymentStatus} · ${b.paymentMode}`,
        date: b.billDate.toISOString(),
        meta: { total: b.totalPayable, status: b.paymentStatus, mode: b.paymentMode },
      });
    }
    for (const ic of insurance) {
      timeline.push({
        id: ic.id,
        type: "insurance",
        title: `Insurance · ${ic.tpaCompany}`,
        subtitle: `${ic.preAuthStatus} · ₹${ic.estimatedCost.toLocaleString("en-IN")}`,
        date: ic.createdAt.toISOString(),
        meta: { status: ic.preAuthStatus, approved: ic.approvedAmount, copay: ic.patientCopay, cashless: ic.cashless },
      });
    }
    for (const lr of labReports) {
      timeline.push({
        id: lr.id,
        type: "lab",
        title: `Lab · ${lr.testName}`,
        subtitle: `Result: ${lr.resultValue ?? "—"} ${lr.unit ?? ""} (${lr.abnormalFlag})`,
        date: (lr.reportedAt ?? lr.createdAt).toISOString(),
        meta: { flag: lr.abnormalFlag, value: lr.resultValue, unit: lr.unit, refRange: `${lr.refRangeMin ?? ""}-${lr.refRangeMax ?? ""}` },
      });
    }
    for (const bb of bloodBookings) {
      timeline.push({
        id: bb.id,
        type: "blood_booking",
        title: `Blood Test · ${bb.testPanelName}`,
        subtitle: `${bb.status.replace("_", " ")} · ${bb.phlebotomistName ?? "Auto-assigned"}`,
        date: bb.scheduledDate.toISOString(),
        meta: { status: bb.status, price: bb.price, bookingRef: bb.bookingRef },
      });
    }
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const cappedTimeline = timeline.slice(0, 50);

    // ---- AI Insights (rule-based) ----
    const aiInsights: { severity: "info" | "warning" | "alert"; title: string; description: string; icon: string }[] = [];

    // 1. NEWS2 alerts
    const criticalVitals = vitals.filter((v) => (v.news2Score ?? 0) >= 5);
    if (criticalVitals.length > 0) {
      aiInsights.push({
        severity: "alert",
        title: `${criticalVitals.length} elevated NEWS2 reading${criticalVitals.length > 1 ? "s" : ""}`,
        description: `Latest NEWS2 score ${criticalVitals[0].news2Score} — recommends clinical review within 4 hours.`,
        icon: "alert-triangle",
      });
    }

    // 2. Abnormal labs
    const abnormalLabs = labReports.filter((lr) => lr.abnormalFlag === "high" || lr.abnormalFlag === "low" || lr.abnormalFlag === "critical");
    if (abnormalLabs.length > 0) {
      aiInsights.push({
        severity: "warning",
        title: `${abnormalLabs.length} abnormal lab result${abnormalLabs.length > 1 ? "s" : ""} detected`,
        description: `Most recent: ${abnormalLabs[0].testName} = ${abnormalLabs[0].resultValue} ${abnormalLabs[0].unit ?? ""} (${abnormalLabs[0].abnormalFlag}). Consider discussing with your physician.`,
        icon: "flask-conical",
      });
    }

    // 3. Upcoming blood tests
    const upcomingBlood = bloodBookings.filter((b) => b.status === "booked" || b.status === "assigned");
    if (upcomingBlood.length > 0) {
      aiInsights.push({
        severity: "info",
        title: `${upcomingBlood.length} upcoming blood test${upcomingBlood.length > 1 ? "s" : ""}`,
        description: `Next: ${upcomingBlood[0].testPanelName} on ${new Date(upcomingBlood[0].scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} with ${upcomingBlood[0].phlebotomistName ?? "auto-assigned phlebotomist"}.`,
        icon: "drop",
      });
    }

    // 4. Pre-diabetes signal from blood bookings (rule-based scan of AI interpretation)
    const diabetesBooking = bloodBookings.find((b) => b.aiInterpretation?.toLowerCase().includes("pre-diabetes") ?? false);
    if (diabetesBooking) {
      aiInsights.push({
        severity: "warning",
        title: "Pre-diabetes detected in recent blood work",
        description: "HbA1c is in the 5.7–6.4% range. Early lifestyle intervention (diet + 150 min/week exercise) can prevent progression in 58% of cases.",
        icon: "activity",
      });
    }

    // 5. Pending bills
    const unpaidBills = bills.filter((b) => b.paymentStatus === "unpaid" || b.paymentStatus === "partial");
    if (unpaidBills.length > 0) {
      const total = unpaidBills.reduce((s, b) => s + b.totalPayable - (b.paymentStatus === "partial" ? b.subtotal - b.discount : 0), 0);
      aiInsights.push({
        severity: "info",
        title: `${unpaidBills.length} pending bill${unpaidBills.length > 1 ? "s" : ""}`,
        description: `Outstanding balance: ₹${total.toLocaleString("en-IN")}. Pay before due date to avoid late fees.`,
        icon: "receipt",
      });
    }

    // 6. Default positive insight if nothing concerning
    if (aiInsights.length === 0) {
      aiInsights.push({
        severity: "info",
        title: "Your health snapshot looks stable",
        description: "No critical alerts detected. Keep up with your regular check-ups and stay hydrated.",
        icon: "shield-check",
      });
    }

    return NextResponse.json({
      user,
      hospitalPatient,
      stats,
      appointments,
      admissions,
      vitals,
      bills,
      insurance,
      labReports,
      orders,
      bloodBookings,
      familyMembers,
      timeline: cappedTimeline,
      aiInsights,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[portal/dashboard] GET error", err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
