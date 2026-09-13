"use client";

import dynamic from "next/dynamic";

const PatientView = dynamic(
  () => import("./patient-view").then((m) => m.PatientView),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-screen place-items-center bg-[#FBF7F2]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5DFD4] border-t-[#A16207]" />
      </div>
    ),
  }
);

export function LazyConnectPatientView() {
  return <PatientView />;
}
