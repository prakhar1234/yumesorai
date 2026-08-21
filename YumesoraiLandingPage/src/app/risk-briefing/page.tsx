"use client";

import { Suspense } from "react";
import RiskBriefingForm from "./risk-briefing-form";

function RiskBriefingContent() {
  return <RiskBriefingForm />;
}

export default function RiskBriefingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-offwhite" />}>
      <RiskBriefingContent />
    </Suspense>
  );
}
