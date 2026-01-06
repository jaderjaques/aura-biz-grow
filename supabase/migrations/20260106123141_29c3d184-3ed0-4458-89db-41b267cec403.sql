-- Adicionar campo de resumo/notas de conclusão às tarefas
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_notes TEXT;

-- Atualizar trigger para registrar conclusão com notas
CREATE OR REPLACE FUNCTION log_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    -- Marcar timestamp de conclusão
    NEW.completed_at := NOW();
    
    -- Registrar na timeline de atividades
    INSERT INTO activities (
      lead_id, 
      customer_id, 
      deal_id, 
      task_id,
      activity_type, 
      title, 
      description,
      activity_date,
      created_by
    ) VALUES (
      NEW.lead_id, 
      NEW.customer_id, 
      NEW.deal_id, 
      NEW.id,
      'task_completed',
      'Tarefa concluída: ' || NEW.title,
      COALESCE(NEW.completion_notes, 'Tarefa marcada como concluída'),
      NOW(),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Garantir que trigger existe
DROP TRIGGER IF EXISTS task_completion_trigger ON tasks;
CREATE TRIGGER task_completion_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_completion();