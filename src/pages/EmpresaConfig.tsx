import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2, FileKey, Receipt, Upload, CheckCircle,
  AlertTriangle, Loader2, Save, Info, ShieldCheck,
} from "lucide-react";
import {
  useTenantFiscalConfig,
  useSaveTenantFiscalConfig,
  useUploadCertificate,
  TenantFiscalConfig,
  REGIME_TRIBUTARIO_OPTIONS,
  NATUREZA_OPERACAO_OPTIONS,
} from "@/hooks/useTenantFiscalConfig";
import { formatCPF } from "@/lib/format-utils";

function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatZip(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export default function EmpresaConfig() {
  const { data: config, isLoading } = useTenantFiscalConfig();
  const save = useSaveTenantFiscalConfig();
  const uploadCert = useUploadCertificate();

  const [form, setForm] = useState<Partial<TenantFiscalConfig>>({});
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState("");
  const [showCertPassword, setShowCertPassword] = useState(false);
  const certInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (config) {
      setForm(config);
    }
  }, [config]);

  const set = (field: keyof TenantFiscalConfig, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSaveEmpresa = () => save.mutate(form);
  const handleSaveFiscal = () => save.mutate(form);

  const handleCertUpload = async () => {
    if (!certFile || !certPassword) return;
    await uploadCert.mutateAsync({ file: certFile, password: certPassword });
    setCertFile(null);
    setCertPassword("");
  };

  const certExpiresAt = config?.certificate_expires_at
    ? new Date(config.certificate_expires_at)
    : null;
  const certExpired = certExpiresAt ? certExpiresAt < new Date() : false;
  const certExpiringSoon =
    certExpiresAt && !certExpired
      ? certExpiresAt < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : false;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Empresa</h1>
          <p className="text-muted-foreground">
            Dados da empresa e configurações fiscais para emissão de NFS-e
          </p>
        </div>

        <Tabs defaultValue="empresa">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="empresa">
              <Building2 className="h-4 w-4 mr-2" />
              Dados da Empresa
            </TabsTrigger>
            <TabsTrigger value="fiscal">
              <Receipt className="h-4 w-4 mr-2" />
              Configurações Fiscais
            </TabsTrigger>
          </TabsList>

          {/* ─── ABA DADOS DA EMPRESA ─── */}
          <TabsContent value="empresa" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Identificação</CardTitle>
                <CardDescription>Dados cadastrais da empresa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Razão Social *</Label>
                    <Input
                      value={form.razao_social ?? ""}
                      onChange={(e) => set("razao_social", e.target.value)}
                      placeholder="Nome Empresarial Ltda"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Nome Fantasia</Label>
                    <Input
                      value={form.nome_fantasia ?? ""}
                      onChange={(e) => set("nome_fantasia", e.target.value)}
                      placeholder="Como é conhecido"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>CNPJ *</Label>
                    <Input
                      value={formatCNPJ(form.cnpj ?? "")}
                      onChange={(e) => set("cnpj", e.target.value.replace(/\D/g, ""))}
                      placeholder="00.000.000/0001-00"
                      maxLength={18}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Inscrição Municipal *</Label>
                    <Input
                      value={form.inscricao_municipal ?? ""}
                      onChange={(e) => set("inscricao_municipal", e.target.value)}
                      placeholder="Necessário para NFS-e"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Inscrição Estadual</Label>
                    <Input
                      value={form.inscricao_estadual ?? ""}
                      onChange={(e) => set("inscricao_estadual", e.target.value)}
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>E-mail da empresa</Label>
                    <Input
                      type="email"
                      value={form.email ?? ""}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="contato@empresa.com.br"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Telefone</Label>
                  <Input
                    value={form.phone ?? ""}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="(31) 99999-9999"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Endereço</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2 space-y-1">
                    <Label>Logradouro</Label>
                    <Input
                      value={form.address_street ?? ""}
                      onChange={(e) => set("address_street", e.target.value)}
                      placeholder="Rua, Avenida, etc."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Número</Label>
                    <Input
                      value={form.address_number ?? ""}
                      onChange={(e) => set("address_number", e.target.value)}
                      placeholder="123"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Complemento</Label>
                    <Input
                      value={form.address_complement ?? ""}
                      onChange={(e) => set("address_complement", e.target.value)}
                      placeholder="Sala 10, Andar 2..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Bairro</Label>
                    <Input
                      value={form.address_neighborhood ?? ""}
                      onChange={(e) => set("address_neighborhood", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-1 space-y-1">
                    <Label>CEP</Label>
                    <Input
                      value={formatZip(form.address_zip ?? "")}
                      onChange={(e) => set("address_zip", e.target.value.replace(/\D/g, ""))}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Cidade</Label>
                    <Input
                      value={form.address_city ?? "Belo Horizonte"}
                      onChange={(e) => set("address_city", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Estado</Label>
                    <Input
                      value={form.address_state ?? "MG"}
                      onChange={(e) => set("address_state", e.target.value)}
                      maxLength={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveEmpresa} disabled={save.isPending}>
                {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Dados da Empresa
              </Button>
            </div>
          </TabsContent>

          {/* ─── ABA FISCAL / NFS-e ─── */}
          <TabsContent value="fiscal" className="space-y-4 mt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Todas as informações fiscais abaixo são fornecidas pela empresa emissora.
                Consulte seu contador para preencher corretamente os campos de tributação.
              </AlertDescription>
            </Alert>

            {/* Ambiente */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ambiente NFS-e</CardTitle>
                <CardDescription>
                  Use Homologação para testes. Mude para Produção somente quando validado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Select
                    value={form.nfse_ambiente ?? "homologacao"}
                    onValueChange={(v) => set("nfse_ambiente", v)}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homologacao">
                        🧪 Homologação (testes)
                      </SelectItem>
                      <SelectItem value="producao">
                        🏭 Produção
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge
                    variant={form.nfse_ambiente === "producao" ? "default" : "secondary"}
                    className={form.nfse_ambiente === "producao" ? "bg-green-600" : ""}
                  >
                    {form.nfse_ambiente === "producao" ? "PRODUÇÃO" : "HOMOLOGAÇÃO"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Dados do serviço */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dados do Serviço</CardTitle>
                <CardDescription>
                  Informações sobre o serviço prestado e tributação. Preencha conforme orientação do contador.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Código do Serviço (LC 116/2003)</Label>
                    <Input
                      value={form.nfse_codigo_servico ?? ""}
                      onChange={(e) => set("nfse_codigo_servico", e.target.value)}
                      placeholder="Ex: 4.01"
                    />
                    <p className="text-xs text-muted-foreground">
                      Item da Lista de Serviços da Lei Complementar 116
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label>CNAE</Label>
                    <Input
                      value={form.nfse_cnae ?? ""}
                      onChange={(e) => set("nfse_cnae", e.target.value)}
                      placeholder="Ex: 8630-5/04"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Alíquota ISS (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={form.nfse_aliquota_iss ?? ""}
                      onChange={(e) => set("nfse_aliquota_iss", parseFloat(e.target.value) || null)}
                      placeholder="Ex: 5.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Regime Tributário</Label>
                    <Select
                      value={form.nfse_regime_tributario ?? ""}
                      onValueChange={(v) => set("nfse_regime_tributario", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIME_TRIBUTARIO_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Natureza da Operação</Label>
                  <Select
                    value={form.nfse_natureza_operacao ?? "1"}
                    onValueChange={(v) => set("nfse_natureza_operacao", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NATUREZA_OPERACAO_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-3 pt-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Optante pelo Simples Nacional</Label>
                      <p className="text-xs text-muted-foreground">Empresa enquadrada no Simples Nacional</p>
                    </div>
                    <Switch
                      checked={form.nfse_optante_simples ?? false}
                      onCheckedChange={(v) => set("nfse_optante_simples", v)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Incentivador Cultural</Label>
                      <p className="text-xs text-muted-foreground">Empresa incentivadora de atividades culturais</p>
                    </div>
                    <Switch
                      checked={form.nfse_incentivador ?? false}
                      onCheckedChange={(v) => set("nfse_incentivador", v)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* RPS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Numeração RPS</CardTitle>
                <CardDescription>
                  Recibo Provisório de Serviços — numeração sequencial das notas emitidas
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Série RPS</Label>
                  <Input
                    value={form.nfse_serie_rps ?? ""}
                    onChange={(e) => set("nfse_serie_rps", e.target.value)}
                    placeholder="Ex: RPS"
                    maxLength={5}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Próximo número RPS</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.nfse_numero_rps ?? 1}
                    onChange={(e) => set("nfse_numero_rps", parseInt(e.target.value) || 1)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Número da próxima NFS-e a ser emitida
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Certificado Digital */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileKey className="h-4 w-4" />
                  Certificado Digital A1
                </CardTitle>
                <CardDescription>
                  Arquivo .pfx ou .p12 emitido por uma Autoridade Certificadora (ICP-Brasil).
                  Armazenado com segurança — máximo 5MB.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status do certificado atual */}
                {config?.certificate_path && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${
                    certExpired
                      ? "border-destructive/50 bg-destructive/10"
                      : certExpiringSoon
                      ? "border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20"
                      : "border-green-500/50 bg-green-50 dark:bg-green-950/20"
                  }`}>
                    {certExpired ? (
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                    ) : certExpiringSoon ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
                    )}
                    <div>
                      <p className="font-medium">
                        {certExpired ? "Certificado vencido" : certExpiringSoon ? "Vencendo em breve" : "Certificado válido"}
                      </p>
                      {config.certificate_subject && (
                        <p className="text-xs text-muted-foreground">{config.certificate_subject}</p>
                      )}
                      {certExpiresAt && (
                        <p className="text-xs text-muted-foreground">
                          Validade: {certExpiresAt.toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Upload novo certificado */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>{config?.certificate_path ? "Substituir certificado" : "Enviar certificado"}</Label>
                    <div
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => certInputRef.current?.click()}
                    >
                      <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {certFile ? (
                          <span className="font-medium text-primary">{certFile.name}</span>
                        ) : (
                          <>Clique para selecionar o arquivo <strong>.pfx</strong> ou <strong>.p12</strong></>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Máximo 5MB</p>
                    </div>
                    <input
                      ref={certInputRef}
                      type="file"
                      accept=".pfx,.p12"
                      className="hidden"
                      onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
                    />
                  </div>

                  {certFile && (
                    <div className="space-y-1">
                      <Label>Senha do certificado</Label>
                      <div className="relative">
                        <Input
                          type={showCertPassword ? "text" : "password"}
                          value={certPassword}
                          onChange={(e) => setCertPassword(e.target.value)}
                          placeholder="Senha do arquivo .pfx"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowCertPassword((v) => !v)}
                        >
                          {showCertPassword ? "🙈" : "👁"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {certFile && (
                    <Button
                      onClick={handleCertUpload}
                      disabled={!certPassword || uploadCert.isPending}
                      className="w-full"
                    >
                      {uploadCert.isPending ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</>
                      ) : (
                        <><CheckCircle className="h-4 w-4 mr-2" />Enviar Certificado</>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveFiscal} disabled={save.isPending}>
                {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Configurações Fiscais
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
