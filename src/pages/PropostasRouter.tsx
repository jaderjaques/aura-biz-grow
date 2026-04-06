import { useTenantModule } from "@/hooks/useTenantModule";
import Deals from "./Deals";
import TreatmentPlans from "./TreatmentPlans";

export default function PropostasRouter() {
  const { isClinic } = useTenantModule();
  return isClinic ? <TreatmentPlans /> : <Deals />;
}
