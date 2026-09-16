import { NextResponse } from "next/server";
import { withRoute } from "@/lib/nx/api";

export const GET = withRoute("root.hello", async () => {
  return NextResponse.json({ message: "Hello, world!" });
});