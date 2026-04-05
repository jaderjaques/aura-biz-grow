import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users, Shield, UserCheck, UserX, Search, Plus } from "lucide-react";
import { usePatients } from "@/hooks/usePatients";
import { PatientsTable } from "@/components/patients/PatientsTable";
import { PatientDetailsSidebar } from "@/components/patients/PatientDetailsSidebar";
import { NewPatientDialog } from "@/components/patients/NewPatientDialog";
import { PatientWithDetails } from "@/types/patients";

export default function Patients() {
  const {
    patients,
    insurances,
    loading,
    createPatient,
    updatePatient,
    deletePatient,
    getActivePatients,
    getPatientsWithInsurance,
    getPatientsPrivate,
  } = usePatients();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterInsurance, setFilterInsurance] = useState("all");
  const [selectedPatient, setSelectedPatient] = useState<PatientWithDetails | null>(null);
  const [newPatientOpen, setNewPatientOpen] = useState(false);

  const filtered = patients.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cpf?.includes(searchTerm) ||
      p.phone.includes(searchTerm) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "all" || p.status === filterStatus;

    const matchesInsurance =
      filterInsurance === "all" ||
      (filterInsurance === "particular" && !p.has_insurance) ||
      (filterInsurance === "convenio" && p.has_insurance) ||
      p.insurance_id === filterInsurance;

    return matchesSearch && matchesStatus && matchesInsurance;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Pacientes</h1>
          <Button onClick={() => setNewPatientOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Paciente
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Pacientes</p>
                  <p className="text-2xl font-bold">{patients.length}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-bold">{getActivePatients().length}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Com Convênio</p>
                  <p className="text-2xl font-bold">{getPatientsWithInsurance().length}</p>
                </div>
                <Shield className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Particular</p>
                  <p className="text-2xl font-bold">{getPatientsPrivate().length}</p>
                </div>
                <UserX className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela com filtros */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Pacientes</CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome, CPF, telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                    <SelectItem value="blocked">Bloqueados</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterInsurance} onValueChange={setFilterInsurance}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Convênio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="particular">Particular</SelectItem>
                    <SelectItem value="convenio">Com Convênio</SelectItem>
                    {insurances.map((ins) => (
                      <SelectItem key={ins.id} value={ins.id}>{ins.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando pacientes...
              </div>
            ) : (
              <PatientsTable
                patients={filtered}
                onView={setSelectedPatient}
                onDelete={deletePatient}
              />
            )}
          </CardContent>
        </Card>

        <NewPatientDialog
          open={newPatientOpen}
          onOpenChange={setNewPatientOpen}
          onSave={createPatient}
          insurances={insurances}
        />

        <PatientDetailsSidebar
          patient={selectedPatient}
          open={!!selectedPatient}
          onOpenChange={(open) => !open && setSelectedPatient(null)}
          onUpdate={updatePatient}
          insurances={insurances}
        />
      </div>
    </AppLayout>
  );
}
