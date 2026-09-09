import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){try{const visits=await db.clinicVisit.findMany({take:100,select:{diagnosis:true,createdAt:true}});const byDx:Record<string,number>={};for(const v of visits){if(v.diagnosis){byDx[v.diagnosis]=(byDx[v.diagnosis]||0)+1;}}const top=Object.entries(byDx).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([dx,count])=>({diagnosis:dx,count}));return NextResponse.json({topDiagnoses:top,totalVisits:visits.length,source:"Veradigm-inspired prescribing pattern analysis"});}catch(e){return NextResponse.json({error:"failed"},{status:500});}}
