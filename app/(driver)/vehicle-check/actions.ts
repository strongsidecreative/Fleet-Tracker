"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CHECKLIST_ITEMS } from "@/lib/vehicleCheckItems";

type ActionState = { error: string | null };

export async function submitVehicleCheck(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const vehicleId = formData.get("vehicleId") as string;
  const checkType = formData.get("checkType") as string;
  const initialsRaw = (formData.get("initials") as string)?.trim();
  const confirmed = formData.get("confirmed") === "on";

  if (!vehicleId) return { error: "Please select a vehicle." };
  if (!checkType || !["pre", "post"].includes(checkType)) return { error: "Please choose Pre-Operation or Post-Operation." };
  if (!initialsRaw) return { error: "Please enter your initials." };
  if (!confirmed) return { error: "Please confirm you've completed this check accurately." };

  const initials = initialsRaw.toUpperCase();

  // Validate and collect every checklist item. Comment is required when the
  // item is marked Issue.
  const items: { key: string; label: string; result: string; comment: string | null; photo: File | null }[] = [];
  for (const item of CHECKLIST_ITEMS) {
    const result = formData.get(`result_${item.key}`) as string;
    if (!result || !["ok", "issue"].includes(result)) {
      return { error: `Please mark ${item.label} as OK or Issue.` };
    }
    const comment = (formData.get(`comment_${item.key}`) as string)?.trim() || null;
    if (result === "issue" && !comment) {
      return { error: `Please describe the issue for ${item.label}.` };
    }
    const photo = formData.get(`photo_${item.key}`) as File | null;
    items.push({ key: item.key, label: item.label, result, comment, photo: photo && photo.size > 0 ? photo : null });
  }

  // Current KM is always read fresh from the vehicle record itself — never
  // trusted from the client — so the snapshot is guaranteed accurate and
  // there's exactly one authoritative odometer in the whole system.
  const { data: vehicle } = await supabase.from("vehicles").select("current_odometer").eq("id", vehicleId).single();
  if (!vehicle) return { error: "That vehicle couldn't be found. Please try again." };

  const issueCount = items.filter((i) => i.result === "issue").length;
  const overallResult = issueCount > 0 ? "issues_reported" : "all_ok";

  const { data: check, error: checkError } = await supabase
    .from("vehicle_checks")
    .insert({
      vehicle_id: vehicleId,
      driver_id: user!.id,
      check_type: checkType,
      odometer_snapshot: vehicle.current_odometer,
      overall_result: overallResult,
      issue_count: issueCount,
      initials,
      confirmed: true,
    })
    .select()
    .single();

  if (checkError || !check) {
    return { error: "Something went wrong saving this check. Please try again." };
  }

  for (const item of items) {
    let photoUrl: string | null = null;

    if (item.photo) {
      const ext = item.photo.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
      const path = `checks/${check.id}-${item.key}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("vehicle-photos")
        .upload(path, item.photo, { contentType: item.photo.type });
      if (!uploadError) {
        photoUrl = supabase.storage.from("vehicle-photos").getPublicUrl(path).data.publicUrl;
      }
    }

    await supabase.from("vehicle_check_items").insert({
      check_id: check.id,
      item_key: item.key,
      item_label: item.label,
      result: item.result,
      comment: item.comment,
      photo_url: photoUrl,
    });
  }

  redirect(`/vehicle-check/${check.id}?success=Vehicle check submitted`);
}
