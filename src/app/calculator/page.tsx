"use client";

import { Suspense } from "react";
import RiskCalculatorForm from "./risk-calculator-form";

function RiskCalculatorContent() {
  return <RiskCalculatorForm />;
}

export default function CalculatorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-offwhite" />}>
      <RiskCalculatorContent />
    </Suspense>
  );
}
