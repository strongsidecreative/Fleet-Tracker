"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type ActionState = { error: string | null };

export async function submitIncident(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const vehicleId = formData.get("vehicleId") as string;
  const description = (formData.get("description") as string)?.trim();
  const severity = (formData.get("severity") as string) || "low";
  const reportType = (formData.get("reportType") as string) || "incident";
  const checkArea = (formData.get("checkArea") as string) || null;

  const incidentDate = (formData.get("incidentDate") as string) || null;
  const incidentTime = (formData.get("incidentTime") as string) || null;
  const location = (formData.get("location") as string)?.trim() || null;

  const policeInvolved = formData.get("policeInvolved") === "true";
  const policeDetails = (formData.get("policeDetails") as string)?.trim() || null;

  const otherVehicleDamage = formData.get("otherVehicleDamage") === "true";
  const propertyDamageDetails = (formData.get("propertyDamageDetails") as string)?.trim() || null;

  const witnessInvolved = formData.get("witnessInvolved") === "true";
  const witnessDetails = (formData.get("witnessDetails") as string)?.trim() || null;

  if (!vehicleId || !description) {
    return { error: "Please choose a vehicle and describe what happened." };
  }

  const { error } = await supabase.from("incident_reports").insert({
    vehicle_id: vehicleId,
    driver_id: user!.id,
    description,
    severity,
    report_type: reportType,
    check_area: reportType === "general_check" ? checkArea : null,
    incident_date: incidentDate,
    incident_time: incidentTime,
    location,
    police_involved: policeInvolved,
    police_details: policeInvolved ? policeDetails : null,
    other_vehicle_damage: otherVehicleDamage,
    property_damage_details: otherVehicleDamage ? propertyDamageDetails : null,
    witness_involved: witnessInvolved,
    witness_details: witnessInvolved ? witnessDetails : null,
  });

  if (error) {
    return { error: "Something went wrong submitting this report. Please try again." };
  }

  redirect("/?success=Report submitted");
}
