import { useTenantModule } from "@/hooks/useTenantModule";
import AgendaPage from "./Agenda";
import ClinicAgenda from "./ClinicAgenda";

export default function AgendaRouter() {
  const { isClinic } = useTenantModule();
  return isClinic ? <ClinicAgenda /> : <AgendaPage />;
}
