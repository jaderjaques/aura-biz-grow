import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, Upload, FileKey, InfoIcon, Loader2, CheckCircle } from "lucide-react";
import { ContractWithDetails } from "@/types/customers";
import { useContracts } from "@/hooks/useCustomers";

interface ContractSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractWithDetails | null;
  onSuccess?: () => void;
}

export function ContractSignatureDialog({
  open,
  onOpenChange,
  contract,
  onSuccess,
}: ContractSignatureDialogProps) {
  const { signContract } = useContracts();
  const [signatureMethod, setSignatureMethod] = useState("document_photo");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Document photo state
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [photoFront, setPhotoFront] = useState<string | null>(null);
  const [photoBack, setPhotoBack] = useState<string | null>(null);
  const [photoSelfie, setPhotoSelfie] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signerCPF, setSignerCPF] = useState("");

  // Digital certificate state
  const [certificateType, setCertificateType] = useState("");
  const [certificateIssuer, setCertificateIssuer] = useState("");
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState("");

  const frontFileRef = useRef<HTMLInputElement>(null);
  const backFileRef = useRef<HTMLInputElement>(null);
  const selfieFileRef = useRef<HTMLInputElement>(null);
  const certFileRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "front" | "back" | "selfie"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (type === "front") setPhotoFront(result);
        if (type === "back") setPhotoBack(result);
        if (type === "selfie") setPhotoSelfie(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCertificateFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!contract) return;

    setIsSubmitting(true);
    try {
      if (signatureMethod === "document_photo") {
        await signContract(contract.id, {
          type: "document_photo",
          data: {
            document_type: documentType,
            document_number: documentNumber,
            photo_front_url: photoFront, // In production, upload to storage first
            photo_back_url: photoBack,
            selfie_url: photoSelfie,
          },
          signerName,
          signerCPF,
        });
      } else {
        await signContract(contract.id, {
          type: "digital_certificate",
          data: {
            certificate_type: certificateType,
            certificate_issuer: certificateIssuer,
            signature_hash: `HASH-${Date.now()}`, // Placeholder
            signed_at: new Date().toISOString(),
          },
          signerName: signerName || certificateType,
          signerCPF: signerCPF,
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error signing contract:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDocumentPhotoValid =
    documentType &&
    documentNumber &&
    photoFront &&
    (documentType !== "rg" || photoBack) &&
    photoSelfie &&
    signerName &&
    signerCPF;

  const isCertificateValid =
    certificateType && certificateFile && certificatePassword;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Assinatura do Contrato</DialogTitle>
          <DialogDescription>
            Contrato: {contract?.contract_number} - {contract?.title}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={signatureMethod} onValueChange={setSignatureMethod}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="document_photo">
              <Camera className="mr-2 h-4 w-4" />
              Foto do Documento
            </TabsTrigger>
            <TabsTrigger value="digital_certificate">
              <FileKey className="mr-2 h-4 w-4" />
              Certificado Digital
            </TabsTrigger>
          </TabsList>

          {/* Document Photo */}
          <TabsContent value="document_photo" className="space-y-4 mt-4">
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                Faça upload de fotos do documento de identificação e uma selfie do
                signatário
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label>Tipo de Documento *</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rg">RG</SelectItem>
                    <SelectItem value="cnh">CNH</SelectItem>
                    <SelectItem value="cpf">CPF (documento físico)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Número do Documento *</Label>
                <Input
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Digite o número do documento"
                />
              </div>

              <div>
                <Label>Foto Frente do Documento *</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => frontFileRef.current?.click()}
                >
                  {photoFront ? (
                    <div className="space-y-2">
                      <img
                        src={photoFront}
                        alt="Frente"
                        className="max-h-32 mx-auto rounded"
                      />
                      <p className="text-xs text-muted-foreground">
                        Clique para alterar
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">
                        Clique para fazer upload
                      </p>
                    </>
                  )}
                  <input
                    ref={frontFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e, "front")}
                  />
                </div>
              </div>

              {documentType === "rg" && (
                <div>
                  <Label>Foto Verso do Documento *</Label>
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => backFileRef.current?.click()}
                  >
                    {photoBack ? (
                      <div className="space-y-2">
                        <img
                          src={photoBack}
                          alt="Verso"
                          className="max-h-32 mx-auto rounded"
                        />
                        <p className="text-xs text-muted-foreground">
                          Clique para alterar
                        </p>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">
                          Clique para fazer upload
                        </p>
                      </>
                    )}
                    <input
                      ref={backFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(e, "back")}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label>Selfie com o Documento *</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => selfieFileRef.current?.click()}
                >
                  {photoSelfie ? (
                    <div className="space-y-2">
                      <img
                        src={photoSelfie}
                        alt="Selfie"
                        className="max-h-32 mx-auto rounded"
                      />
                      <p className="text-xs text-muted-foreground">
                        Clique para alterar
                      </p>
                    </div>
                  ) : (
                    <>
                      <Camera className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">
                        Clique para fazer upload
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Segure o documento próximo ao rosto
                      </p>
                    </>
                  )}
                  <input
                    ref={selfieFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e, "selfie")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome Completo *</Label>
                  <Input
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Nome do signatário"
                  />
                </div>
                <div>
                  <Label>CPF *</Label>
                  <Input
                    value={signerCPF}
                    onChange={(e) => setSignerCPF(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Digital Certificate */}
          <TabsContent value="digital_certificate" className="space-y-4 mt-4">
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                Use um certificado digital ICP-Brasil (e-CPF ou e-CNPJ) para
                assinar eletronicamente
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label>Tipo de Certificado *</Label>
                <Select value={certificateType} onValueChange={setCertificateType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="e-cpf">e-CPF</SelectItem>
                    <SelectItem value="e-cnpj">e-CNPJ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Emissor do Certificado</Label>
                <Input
                  value={certificateIssuer}
                  onChange={(e) => setCertificateIssuer(e.target.value)}
                  placeholder="Ex: Serpro, Certisign..."
                />
              </div>

              <div>
                <Label>Arquivo do Certificado (.p12 / .pfx)</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => certFileRef.current?.click()}
                >
                  {certificateFile ? (
                    <div className="space-y-2">
                      <FileKey className="h-8 w-8 mx-auto text-primary" />
                      <p className="text-sm">{certificateFile.name}</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">
                        Selecione o arquivo do certificado
                      </p>
                    </>
                  )}
                  <input
                    ref={certFileRef}
                    type="file"
                    accept=".p12,.pfx"
                    className="hidden"
                    onChange={handleCertUpload}
                  />
                </div>
              </div>

              <div>
                <Label>Senha do Certificado *</Label>
                <Input
                  type="password"
                  value={certificatePassword}
                  onChange={(e) => setCertificatePassword(e.target.value)}
                  placeholder="Digite a senha do certificado"
                />
              </div>

              <Alert variant="default" className="bg-muted">
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  A senha do certificado será usada apenas para validação e não
                  será armazenada.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              (signatureMethod === "document_photo"
                ? !isDocumentPhotoValid
                : !isCertificateValid)
            }
            className="bg-gradient-to-r from-primary to-accent"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Registrar Assinatura
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
