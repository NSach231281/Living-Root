import React from "react";

// Placeholder for Stage 1 — confirms routing/role/layout work end to end.
// This gets replaced with the real month/week grid in Stage 2.
export default function AnnualPipeline() {
  return (
    <div className="p-6" style={{fontFamily:"ui-sans-serif,system-ui,sans-serif"}}>
      <div style={{fontSize:18,fontWeight:800,marginBottom:6}}>Annual Planning Pipeline</div>
      <div style={{fontSize:13,color:"#7A8690"}}>
        ✅ Role, login routing, and sidebar are working. The month/week pipeline grid arrives in Stage 2.
      </div>
    </div>
  );
}
