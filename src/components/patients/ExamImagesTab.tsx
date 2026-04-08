import { useState, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Upload, ImageIcon, Trash2, ZoomIn, Calendar, FileImage, Loader2,
} from "lucide-react";
import { usePatientExams, PatientExamImage } from "@/hooks/usePatientExams";

interface ExamImagesTabProps {
  patientId: string;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const MAX_SIZE_MB = 10;

export function ExamImagesTab({ patientId }: ExamImagesTabProps) {
  const { images, loading, uploading, uploadImage, deleteImage, getSignedUrl } =
    usePatientExams(patientId);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PatientExamImage | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Form de upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [examDate, setExamDate] = useState("");
  const [fileError, setFileError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError("");
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setFileError("Formato não suportado. Use JPG, PNG, WEBP, GIF ou PDF.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setFileError(`Arquivo muito grande. Máximo ${MAX_SIZE_MB}MB.`);
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    const result = await uploadImage(selectedFile, { description, exam_date: examDate });
    if (result) {
      setUploadOpen(false);
      setSelectedFile(null);
      setDescription("");
      setExamDate("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handlePreview = async (image: PatientExamImage) => {
    setLoadingPreview(true);
    setPreviewName(image.file_name);
    try {
      const url = await getSignedUrl(image);
      setPreviewUrl(url);
    } finally {
      setLoadingPreview(false);
    }
  };

  const isImage = (name: string) =>
    /\.(jpg|jpeg|png|webp|gif)$/i.test(name);

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Carregando exames...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {images.length} {images.length === 1 ? "imagem" : "imagens"}
        </p>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Enviar Exame
        </Button>
      </div>

      {/* Grid de imagens */}
      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm gap-3">
          <FileImage className="h-10 w-10 opacity-30" />
          <p>Nenhuma imagem de exame cadastrada.</p>
          <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Enviar primeiro exame
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {images.map((img) => (
            <Card key={img.id} className="overflow-hidden group">
              <CardContent className="p-0">
                {/* Thumbnail ou ícone PDF */}
                <div className="relative h-32 bg-muted flex items-center justify-center overflow-hidden">
                  {isImage(img.file_name) ? (
                    <img
                      src={img.file_url}
                      alt={img.file_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <FileImage className="h-8 w-8" />
                      <span className="text-xs">PDF</span>
                    </div>
                  )}
                  {/* Overlay com ações */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => handlePreview(img)}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={() => setDeleteTarget(img)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-2 space-y-0.5">
                  <p className="text-xs font-medium truncate" title={img.file_name}>
                    {img.file_name}
                  </p>
                  {img.description && (
                    <p className="text-xs text-muted-foreground truncate">{img.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {img.exam_date ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(img.exam_date), "dd/MM/yyyy")}
                      </span>
                    ) : (
                      <span>
                        {format(new Date(img.created_at), "dd/MM/yy", { locale: ptBR })}
                      </span>
                    )}
                    {img.file_size && (
                      <span>{formatBytes(img.file_size)}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de upload */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Enviar Imagem de Exame
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Drop zone */}
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {selectedFile ? (
                <div className="space-y-1">
                  <FileImage className="h-8 w-8 mx-auto text-primary" />
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
                  <p className="text-xs text-muted-foreground">Clique para trocar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique para selecionar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, WEBP, GIF, PDF · Máx. {MAX_SIZE_MB}MB
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED.join(",")}
              className="hidden"
              onChange={handleFileChange}
            />
            {fileError && (
              <p className="text-xs text-destructive">{fileError}</p>
            )}

            {/* Data do exame */}
            <div className="space-y-1">
              <Label className="text-sm">Data do exame</Label>
              <Input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </div>

            {/* Descrição */}
            <div className="space-y-1">
              <Label className="text-sm">Descrição (opcional)</Label>
              <Input
                placeholder="Ex: Radiografia panorâmica, Tomografia..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploading || !!fileError}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview lightbox */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate text-sm">{previewName}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center max-h-[70vh] overflow-auto">
            {loadingPreview ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : previewUrl && isImage(previewName) ? (
              <img
                src={previewUrl}
                alt={previewName}
                className="max-w-full max-h-[65vh] object-contain rounded"
              />
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-[65vh] rounded border"
                title={previewName}
              />
            ) : null}
          </div>
          <DialogFooter>
            {previewUrl && (
              <Button variant="outline" asChild>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" download={previewName}>
                  Baixar
                </a>
              </Button>
            )}
            <Button onClick={() => setPreviewUrl(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover imagem?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.file_name}</strong> será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleteTarget) await deleteImage(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
