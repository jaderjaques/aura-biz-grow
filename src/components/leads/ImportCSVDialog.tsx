import { useState, useRef } from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ParsedLead {
  company_name: string;
  phone: string;
  email?: string;
  contact_name?: string;
  position?: string;
  segment?: string;
}

interface ImportCSVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (leads: ParsedLead[]) => Promise<void>;
}

export function ImportCSVDialog({ open, onOpenChange, onImport }: ImportCSVDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedLead[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrors(["Arquivo muito grande. Máximo permitido: 10MB"]);
        return;
      }
      setSelectedFile(file);
      parseCSV(file);
    }
  };

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validationErrors: string[] = [];
        const validLeads: ParsedLead[] = [];

        results.data.forEach((row: unknown, index: number) => {
          const typedRow = row as Record<string, string>;
          const companyName = typedRow.company_name || typedRow.empresa || typedRow.nome_empresa;
          const phone = typedRow.phone || typedRow.telefone || typedRow.celular;

          if (!companyName || !phone) {
            validationErrors.push(`Linha ${index + 2}: company_name e phone são obrigatórios`);
            return;
          }

          validLeads.push({
            company_name: companyName,
            phone: phone,
            email: typedRow.email || typedRow.e_mail || undefined,
            contact_name: typedRow.contact_name || typedRow.contato || typedRow.nome_contato || undefined,
            position: typedRow.position || typedRow.cargo || undefined,
            segment: typedRow.segment || typedRow.segmento || undefined,
          });
        });

        if (validationErrors.length > 0 && validationErrors.length <= 5) {
          setErrors(validationErrors);
        } else if (validationErrors.length > 5) {
          setErrors([
            ...validationErrors.slice(0, 5),
            `... e mais ${validationErrors.length - 5} erros`,
          ]);
        }

        setParsedData(validLeads);
      },
      error: (error) => {
        setErrors([`Erro ao processar arquivo: ${error.message}`]);
      },
    });
  };

  const handleImport = async () => {
    if (!parsedData || parsedData.length === 0) return;
    
    setImporting(true);
    try {
      await onImport(parsedData);
      handleClose();
    } catch (error) {
      console.error("Import error:", error);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setParsedData(null);
    setErrors([]);
    onOpenChange(false);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setParsedData(null);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Leads via CSV</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV com seus leads
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              "hover:border-primary hover:bg-accent/50",
              selectedFile && "border-primary bg-accent/30"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Clique para selecionar ou arraste um arquivo
            </p>
            <p className="text-xs text-muted-foreground mt-1">CSV (máx 10MB)</p>
          </div>

          {/* Selected File */}
          {selectedFile && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{selectedFile.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={clearFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erros encontrados</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside text-sm mt-2">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Format Info */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Formato Esperado</CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground mb-2">
                Seu CSV deve conter as seguintes colunas (ordem não importa):
              </p>
              <code className="text-xs bg-muted p-2 rounded block">
                company_name,phone,email,contact_name,position,segment
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Obrigatórios:</strong> company_name, phone
              </p>
            </CardContent>
          </Card>

          {/* Preview */}
          {parsedData && parsedData.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Preview ({parsedData.length} leads)
                </CardTitle>
              </CardHeader>
              <CardContent className="py-3">
                <ScrollArea className="h-48">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 5).map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{row.company_name}</TableCell>
                          <TableCell>{row.phone}</TableCell>
                          <TableCell>{row.email || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                {parsedData.length > 5 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    ... e mais {parsedData.length - 5} leads
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsedData || parsedData.length === 0 || importing}
            className="gradient-cta text-white"
          >
            {importing ? "Importando..." : `Importar ${parsedData?.length || 0} Leads`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
