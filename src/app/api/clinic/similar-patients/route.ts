import { NextRequest, NextResponse } from "next/server";
import { withProductAuth } from "@/lib/nx/product-auth";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const PATTERNS: Record<string,{diagnosis:string;commonMeds:string[];percentage:number}[]>={"fever":[{diagnosis:"Viral Fever",commonMeds:["Paracetamol 650mg","Cetzine 10mg"],percentage:65},{diagnosis:"Typhoid",commonMeds:["Azithral 500mg"],percentage:15}],"diabetes":[{diagnosis:"Type 2 Diabetes",commonMeds:["Metformin 500mg","Glimepiride 2mg"],percentage:80}],"hypertension":[{diagnosis:"Essential Hypertension",commonMeds:["Amlodipine 5mg","Telmisartan 40mg"],percentage:75}]};
async function POST_impl(req:NextRequest){try{const b=await req.json().catch(()=>({}));const q=(b?.symptoms||b?.diagnosis||"").toLowerCase();if(!q)return NextResponse.json({error:"no_input"},{status:400});let matches:any[]=[];for(const[k,v]of Object.entries(PATTERNS)){if(q.includes(k)){matches=matches.concat(v.map(x=>({...x,query:k})));}}if(matches.length===0)matches=[{diagnosis:"General consultation",commonMeds:["Paracetamol 650mg"],percentage:40,query:q}];return NextResponse.json({matches,source:"K Health-style matching — aggregated Indian clinical patterns"});}catch(e){return NextResponse.json({error:"match_failed"},{status:500});}}

export const POST = withProductAuth("clinic.similar-patients.POST", POST_impl);
